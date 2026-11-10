"use client";
import { useEffect, useRef, useState } from "react";
import { AlertIcon, CheckIcon, CloseIcon, DownloadIcon, ImageIcon, ShareIcon } from "@/components/icons";
import { useDialog } from "@/components/hooks/useDialog";
import { MAX_DOWNLOAD_ITEMS } from "@/lib/config";
import type { Slide } from "@/lib/types";
import { SHARE_MAX_ITEMS, canShareFiles, countLabel, fetchAll, zipAndSave, type Fetched } from "./download";

export type DownloadOption = { id: string; label: string; items: Slide[] };

type Props = {
  /** Sheet heading, e.g. "Download" or "Download 6 results". */
  title: string;
  /** Loads the choices. One option skips the picker. */
  load: () => Promise<DownloadOption[]>;
  /** .zip file name for the chosen option. */
  zipName: (option: DownloadOption) => string;
  onClose: () => void;
};

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "choose" }
  | { kind: "preparing"; done: number; total: number; method: "zip" | "share" }
  | { kind: "share-ready"; files: Fetched[]; failed: number }
  | { kind: "done"; label: string; failed: number; method: "zip" | "share" }
  | { kind: "failed"; message: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Bottom sheet: pick My photos / All photos, then Save to Photos (share sheet) or a .zip, with progress. */
export default function DownloadSheet({ title, load, zipName, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [options, setOptions] = useState<DownloadOption[]>([]);
  const [chosen, setChosen] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Only mounted after a tap, never server-rendered, so navigator is safe to read here.
  const [shareable] = useState(canShareFiles);

  function close() {
    abortRef.current?.abort();
    onClose();
  }
  useDialog(ref, close);

  useEffect(() => {
    let live = true;
    load()
      .then((opts) => {
        if (!live) return;
        setOptions(opts);
        // Default to the first option that has something in it.
        setChosen((c) => c || (opts.find((o) => o.items.length > 0) ?? opts[0])?.id || "");
        setPhase({ kind: "choose" });
      })
      .catch(() => live && setPhase({ kind: "error" }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per attempt
  }, [attempt]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const option = options.find((o) => o.id === chosen) ?? options[0];
  const items = option?.items ?? [];
  const capped = items.slice(0, MAX_DOWNLOAD_ITEMS);
  const canShare = shareable && capped.length > 0 && capped.length <= SHARE_MAX_ITEMS;
  const allEmpty = options.length > 0 && options.every((o) => o.items.length === 0);

  async function start(method: "zip" | "share") {
    if (!option || capped.length === 0) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ kind: "preparing", done: 0, total: capped.length, method });
    try {
      const { files, failed } = await fetchAll(
        capped,
        (done) => setPhase({ kind: "preparing", done, total: capped.length, method }),
        ctrl.signal,
      );
      if (files.length === 0) {
        setPhase({ kind: "failed", message: "Couldn't download any of them. Check your connection and try again." });
        return;
      }
      if (method === "share" && canShareFiles(files.map((f) => f.file))) {
        await share(files, failed);
        return;
      }
      await zipAndSave(files, zipName(option));
      setPhase({ kind: "done", label: countLabel(files.map((f) => f.slide)), failed, method: "zip" });
    } catch {
      if (ctrl.signal.aborted) return;
      setPhase({ kind: "failed", message: "Something went wrong building the download. Try again." });
    }
  }

  async function share(files: Fetched[], failed: number) {
    try {
      await navigator.share({ files: files.map((f) => f.file) });
      setPhase({ kind: "done", label: countLabel(files.map((f) => f.slide)), failed, method: "share" });
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      // The fetch took the tap's permission with it: ask for one more tap.
      if (name === "NotAllowedError") setPhase({ kind: "share-ready", files, failed });
      else if (name === "AbortError") setPhase({ kind: "choose" });
      else setPhase({ kind: "failed", message: "The share sheet didn't open. Download a .zip instead." });
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setPhase({ kind: "choose" });
  }

  const status =
    phase.kind === "loading"
      ? "Loading photos…"
      : phase.kind === "preparing"
        ? `Preparing ${phase.done} of ${phase.total}…`
        : phase.kind === "done"
          ? doneTitle(phase)
          : phase.kind === "failed"
            ? phase.message
            : phase.kind === "error"
              ? "Couldn't load the photos."
              : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="animate-fade absolute inset-0 bg-black/75" onClick={close} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-title"
        tabIndex={-1}
        className="animate-sheet relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface sm:border-x"
      >
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="w-12" aria-hidden="true" />
          <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <button
            type="button"
            onClick={close}
            data-autofocus
            aria-label="Close"
            className="grid size-12 place-items-center rounded-full text-muted transition-colors hover:text-fg"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pb-safe sm:px-7">
          <h2 id="download-title" className="text-[26px] leading-tight font-semibold tracking-tight">
            {title}
          </h2>
          <p className="sr-only" aria-live="polite">
            {status}
          </p>

          {phase.kind === "loading" && (
            <div className="mt-5 grid gap-2.5" aria-hidden="true">
              <div className="shimmer h-[72px] rounded-2xl" />
              {options.length !== 1 && <div className="shimmer h-[72px] rounded-2xl" />}
              <div className="shimmer mt-3 h-14 rounded-2xl" />
            </div>
          )}

          {phase.kind === "error" && (
            <Message
              icon={<AlertIcon size={26} className="text-accent" />}
              title="Couldn't load the photos."
              body="Check your connection and try again."
              action={
                <SecondaryButton
                  onClick={() => {
                    setPhase({ kind: "loading" });
                    setAttempt((n) => n + 1);
                  }}
                >
                  Try again
                </SecondaryButton>
              }
            />
          )}

          {phase.kind === "choose" && allEmpty && (
            <Message
              icon={<ImageIcon size={26} className="text-muted" />}
              title="Nothing to download yet."
              body="Photos added here show up for download."
            />
          )}

          {phase.kind === "choose" && !allEmpty && (
            <>
              {options.length > 1 ? (
                <fieldset className="mt-5">
                  <legend className="sr-only">What to download</legend>
                  <div className="grid gap-2.5">
                    {options.map((o) => {
                      const on = o.id === option?.id;
                      const empty = o.items.length === 0;
                      return (
                        <label
                          key={o.id}
                          className={`flex min-h-[72px] items-center gap-4 rounded-2xl border px-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                            empty
                              ? "cursor-not-allowed border-line opacity-50"
                              : on
                                ? "cursor-pointer border-accent/70 bg-raised"
                                : "cursor-pointer border-line-strong hover:bg-raised"
                          }`}
                        >
                          <input
                            type="radio"
                            name="download-scope"
                            value={o.id}
                            checked={on}
                            disabled={empty}
                            onChange={() => setChosen(o.id)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                              on ? "border-accent" : "border-line-strong"
                            }`}
                          >
                            {on && <span className="size-2.5 rounded-full bg-accent" />}
                          </span>
                          <span className="flex-1 text-[17px] font-semibold tracking-tight">{o.label}</span>
                          <span className="text-[15px] text-muted tabular-nums">
                            {empty ? "None yet" : countLabel(o.items)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <p className="mt-2 text-[15px] text-muted tabular-nums">{countLabel(items)}</p>
              )}

              <div className="mt-6 grid gap-2.5">
                {canShare && (
                  <PrimaryButton onClick={() => start("share")}>
                    <ShareIcon size={22} />
                    Save to Photos
                  </PrimaryButton>
                )}
                {canShare ? (
                  <SecondaryButton onClick={() => start("zip")}>
                    <DownloadIcon size={22} className="text-muted" />
                    Download .zip
                  </SecondaryButton>
                ) : (
                  <PrimaryButton onClick={() => start("zip")} disabled={capped.length === 0}>
                    <DownloadIcon size={22} />
                    Download .zip
                    {capped.length > 0 && <span className="font-medium opacity-70 tabular-nums">({capped.length})</span>}
                  </PrimaryButton>
                )}
              </div>
              <p className="mt-3 mb-2 text-sm text-muted">
                {items.length > MAX_DOWNLOAD_ITEMS
                  ? `That's ${items.length}. This downloads the newest ${MAX_DOWNLOAD_ITEMS}.`
                  : canShare
                    ? "Save to Photos opens your phone's share sheet."
                    : "Full-size copies, in one file."}
              </p>
            </>
          )}

          {phase.kind === "preparing" && (
            <div className="mt-6">
              <p className="text-[22px] leading-snug font-semibold tracking-tight tabular-nums">
                Preparing {phase.done} of {phase.total}…
              </p>
              <div
                role="progressbar"
                aria-label="Download progress"
                aria-valuemin={0}
                aria-valuemax={phase.total}
                aria-valuenow={phase.done}
                className="mt-4 h-1.5 overflow-hidden rounded-full bg-line-strong"
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(3, (phase.done / phase.total) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-[15px] text-muted">
                {phase.done === phase.total
                  ? phase.method === "zip"
                    ? "Building your .zip…"
                    : "Opening the share sheet…"
                  : "Keep this screen open."}
              </p>
              <div className="mt-6 mb-2 grid">
                <SecondaryButton onClick={cancel}>Cancel</SecondaryButton>
              </div>
            </div>
          )}

          {phase.kind === "share-ready" && (
            <Message
              icon={<CheckIcon size={26} className="text-success" />}
              title={`${countLabel(phase.files.map((f) => f.slide))} ready.`}
              body="Tap to open the share sheet, then choose Save."
              action={
                <PrimaryButton onClick={() => share(phase.files, phase.failed)}>
                  <ShareIcon size={22} />
                  Save to Photos
                </PrimaryButton>
              }
            />
          )}

          {phase.kind === "done" && (
            <Message
              icon={<CheckIcon size={26} className="text-success" />}
              title={doneTitle(phase)}
              body={[
                phase.method === "zip" ? "Find the .zip in your Downloads." : "",
                phase.failed > 0 ? `${plural(phase.failed, "item", "items")} couldn't be downloaded.` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              action={<SecondaryButton onClick={close}>Done</SecondaryButton>}
            />
          )}

          {phase.kind === "failed" && (
            <Message
              icon={<AlertIcon size={26} className="text-accent" />}
              title="Download didn't finish."
              body={phase.message}
              action={<SecondaryButton onClick={() => setPhase({ kind: "choose" })}>Try again</SecondaryButton>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function doneTitle(p: { label: string; method: "zip" | "share" }): string {
  return p.method === "zip" ? `Downloaded ${p.label}.` : `Shared ${p.label}.`;
}

function Message({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="animate-rise mt-5 mb-2 rounded-2xl border border-line bg-canvas/50 p-5">
      {icon}
      <p className="mt-3 text-xl leading-snug font-semibold tracking-tight">{title}</p>
      {body && <p className="mt-1 text-[15px] text-muted">{body}</p>}
      {action && <div className="mt-5 grid">{action}</div>}
    </div>
  );
}

type ButtonProps = { onClick: () => void; disabled?: boolean; children: React.ReactNode };

function PrimaryButton({ onClick, disabled, children }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-fg text-[17px] font-semibold text-canvas transition-transform active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-line-strong text-[17px] font-semibold transition-colors hover:bg-raised active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
