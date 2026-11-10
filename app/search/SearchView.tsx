"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SearchHit, SearchResponse, Slide } from "@/lib/types";
import { deviceId } from "@/lib/device";
import { getRoom } from "@/lib/client";
import AskPanel from "@/components/ask/AskPanel";
import SlideModal from "@/components/ask/SlideModal";
import { PageHeader, Shimmer, SlideThumb, roomName, slideMeta } from "@/components/ask/ui";
import DownloadSheet from "@/components/download/DownloadSheet";
import { CheckIcon, CloseIcon, DownloadIcon } from "@/components/icons";

const SUGGESTIONS = ["failover", "switching to a backup cluster", "diagram with three clusters", "etcd"];
const PHOTO_SUGGESTIONS = ["green field", "red banner", "group on the rooftop", "whiteboard"];

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; hits: SearchHit[] }
  | { kind: "error" };

/** Elasticsearch highlight fragment with <em> rendered bold, without trusting it as HTML. */
function Highlight({ fragment }: { fragment: string }) {
  // Splitting on a capture group puts the <em> contents at the odd indexes.
  return (
    <>
      {fragment
        .replace(/\s*\n\s*/g, " ")
        .split(/<em>(.*?)<\/em>/)
        .map((part, i) =>
          i % 2 ? (
            <strong key={i} className="font-semibold text-fg">
              {part}
            </strong>
          ) : (
            part
          ),
        )}
    </>
  );
}

type RowProps = { hit: SearchHit; onOpen: () => void; selecting: boolean; selected: boolean; onToggle: () => void };

function ResultRow({ hit, onOpen, selecting, selected, onToggle }: RowProps) {
  const s = hit.slide;
  const fallback = s.text.replace(/\s*\n\s*/g, " ").slice(0, 140);
  return (
    <li>
      <button
        type="button"
        onClick={selecting ? onToggle : onOpen}
        role={selecting ? "checkbox" : undefined}
        aria-checked={selecting ? selected : undefined}
        className={`flex w-full gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent sm:gap-4 ${
          selecting && selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
        }`}
      >
        {selecting && (
          <span
            aria-hidden="true"
            className={`mt-6 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors sm:mt-[37px] ${
              selected ? "border-accent bg-accent text-on-accent" : "border-line-strong"
            }`}
          >
            {selected && <CheckIcon size={16} strokeWidth={2.5} />}
          </span>
        )}
        <SlideThumb slide={s} className="w-32 shrink-0 self-start sm:w-44" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className="line-clamp-2 text-lg font-semibold leading-snug text-fg">
              {s.title || (s.kind === "photo" ? "Untitled photo" : "Untitled slide")}
            </span>
            {s.mine && (
              <span className="mt-1 shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-muted">
                You
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted">{slideMeta(s)}</span>
          <span className="mt-1.5 line-clamp-3 text-[15px] leading-snug text-muted">
            {hit.highlights[0] ? <Highlight fragment={hit.highlights[0]} /> : fallback}
          </span>
        </span>
      </button>
    </li>
  );
}

function ResultSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex gap-3 p-2 sm:gap-4">
          <Shimmer className="aspect-video w-32 shrink-0 rounded-lg sm:w-44" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Shimmer className="h-5 w-4/5" />
            <Shimmer className="h-3.5 w-3/5" />
            <Shimmer className="h-3.5 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const mine = params.get("mine") === "1";
  const tab = params.get("tab") === "ask" ? "ask" : "search";
  const room = params.get("room") ?? "";

  const [input, setInput] = useState(q);
  const [result, setResult] = useState<{ key: string; hits: SearchHit[] | null } | null>(null);
  const [open, setOpen] = useState<Slide | null>(null);
  const [retry, setRetry] = useState(0);
  const [roomInfo, setRoomInfo] = useState<{ room: string; name: string; hosted: boolean } | null>(null);
  // Select mode: the selection belongs to one query, so a new search starts fresh.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const [downloading, setDownloading] = useState<Slide[] | null>(null);

  useEffect(() => {
    if (!room) return;
    let live = true;
    getRoom(room)
      .then((r) => live && setRoomInfo({ room, name: r.room_name || roomName(room), hosted: !!r.hosted }))
      .catch(() => live && setRoomInfo({ room, name: roomName(room), hosted: false }));
    return () => {
      live = false;
    };
  }, [room]);
  const scope = room && roomInfo?.room === room ? roomInfo : null;
  const photos = !!scope?.hosted;

  function go(next: { q?: string; mine?: boolean; tab?: "search" | "ask"; room?: string }) {
    const sp = new URLSearchParams();
    const nq = (next.q ?? q).trim();
    const nroom = next.room ?? room;
    if (nroom) sp.set("room", nroom);
    if (nq) sp.set("q", nq);
    if (next.mine ?? mine) sp.set("mine", "1");
    if ((next.tab ?? tab) === "ask") sp.set("tab", "ask");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Search as you type, debounced; the URL is the source of truth so results are shareable.
  useEffect(() => {
    if (input.trim() === q) return;
    const t = setTimeout(() => go({ q: input }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // One fetch per (query, filter, retry). Loading is derived: a result for an older key.
  const key = `${q}|${mine}|${room}|${retry}`;
  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    const sp = new URLSearchParams({ q, device_id: deviceId() });
    if (mine) sp.set("mine", "1");
    if (room) sp.set("room", room);
    fetch(`/api/search?${sp}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<SearchResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => setResult({ key, hits: data.hits }))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setResult({ key, hits: null });
      });
    return () => ctrl.abort();
  }, [q, mine, room, key]);

  const state: State = !q
    ? { kind: "idle" }
    : result?.key !== key
      ? { kind: "loading" }
      : result.hits
        ? { kind: "done", hits: result.hits }
        : { kind: "error" };

  const hits = state.kind === "done" ? state.hits : [];
  const selectKey = `${q}|${mine}|${room}`;
  const selected = picked.key === selectKey ? picked.ids : new Set<string>();
  const selectedSlides = hits.filter((h) => selected.has(h.slide.slide_id)).map((h) => h.slide);
  const allSelected = hits.length > 0 && selectedSlides.length === hits.length;
  const selectMode = selecting && hits.length > 0;

  function toggle(id: string) {
    setPicked((prev) => {
      const ids = new Set(prev.key === selectKey ? prev.ids : []);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { key: selectKey, ids };
    });
  }

  function toggleAll() {
    setPicked({ key: selectKey, ids: allSelected ? new Set() : new Set(hits.map((h) => h.slide.slide_id)) });
  }

  function stopSelecting() {
    setSelecting(false);
    setPicked({ key: "", ids: new Set() });
  }

  const noun = photos ? "photo" : "slide";
  const chip = (active: boolean) =>
    `h-12 rounded-full px-5 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      active ? "bg-fg text-on-accent" : "border border-line-strong text-muted hover:text-fg"
    }`;

  return (
    <main className={`mx-auto min-h-dvh w-full max-w-3xl px-4 text-fg sm:px-6 ${selectMode ? "pb-36" : "pb-16"}`}>
      <PageHeader current="search" />

      <div className="mt-4 mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-3xl">{tab === "ask" ? (photos ? "Ask the photos" : "Ask the slides") : photos ? "Search photos" : "Search slides"}</h1>
        <div role="tablist" aria-label="Mode" className="flex rounded-xl border border-line bg-surface p-1">
          {(["search", "ask"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => go({ tab: t })}
              className={`h-10 min-w-16 rounded-lg px-4 text-base font-medium capitalize focus-visible:outline-2 focus-visible:outline-accent ${
                tab === t ? "bg-white/[0.1] text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "ask" ? (
        <AskPanel room={room} />
      ) : (
        <>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go({ q: input });
            }}
          >
            <label htmlFor="search-input" className="sr-only">
              {photos ? "Search photos" : "Search slides"}
            </label>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                id="search-input"
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={scope ? (photos ? "Describe a photo" : "Search this room") : "Search every slide snapped today"}
                enterKeyHint="search"
                autoComplete="off"
                className="h-14 w-full rounded-xl border border-line bg-surface pr-4 pl-12 text-lg placeholder:text-muted/70 focus-visible:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40"
              />
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter">
            {room && (
              <span className="flex h-12 max-w-full items-center rounded-full border border-accent/40 bg-accent/10 pl-4 text-base font-medium text-fg">
                <span className="truncate">
                  In {scope?.name ?? roomName(room)}
                </span>
                <button
                  type="button"
                  onClick={() => go({ room: "" })}
                  aria-label={`Search everywhere, not just ${scope?.name ?? roomName(room)}`}
                  className="grid size-12 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
                >
                  <CloseIcon size={18} />
                </button>
              </span>
            )}
            <button type="button" aria-pressed={!mine} onClick={() => go({ mine: false })} className={chip(!mine)}>
              All
            </button>
            <button type="button" aria-pressed={mine} onClick={() => go({ mine: true })} className={chip(mine)}>
              Mine
            </button>
          </div>

          <div className="mt-6" aria-live="polite" aria-busy={state.kind === "loading"}>
            {state.kind === "idle" && (
              <div>
                <p className="text-base text-muted">
                  {photos
                    ? "Describe what's in the photo, or words you remember."
                    : "Search by words on the slide, or describe what you remember."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(photos ? PHOTO_SUGGESTIONS : SUGGESTIONS).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setInput(s);
                        go({ q: s });
                      }}
                      className="h-12 rounded-full border border-line bg-surface px-4 text-base text-fg hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {state.kind === "loading" && <ResultSkeleton />}
            {state.kind === "error" && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
                <p className="text-base text-muted">Search is unavailable right now.</p>
                <button
                  type="button"
                  onClick={() => setRetry((n) => n + 1)}
                  className="h-12 shrink-0 rounded-lg border border-line-strong px-4 text-base font-medium hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Try again
                </button>
              </div>
            )}
            {state.kind === "done" && state.hits.length === 0 && (
              <p className="text-base text-muted">
                {mine ? `None of your ${noun}s match that yet.` : `No ${noun}s match that yet. Try other words.`}
              </p>
            )}
            {state.kind === "done" && state.hits.length > 0 && (
              <>
                <div className="-mt-2 mb-2 flex items-center justify-between gap-3">
                  {selectMode ? (
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="-ml-3 h-12 rounded-lg px-3 text-base font-medium text-fg hover:bg-white/[0.06]"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  ) : (
                    <p className="text-base text-muted tabular-nums">
                      {state.hits.length} {state.hits.length === 1 ? noun : `${noun}s`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => (selectMode ? stopSelecting() : setSelecting(true))}
                    aria-pressed={selectMode}
                    className="-mr-3 h-12 rounded-lg px-3 text-base font-medium text-muted hover:text-fg"
                  >
                    {selectMode ? "Cancel" : "Select"}
                  </button>
                </div>
                <p className="sr-only">
                  {selectMode
                    ? `${selectedSlides.length} selected`
                    : `${state.hits.length} ${state.hits.length === 1 ? noun : `${noun}s`} found`}
                </p>
                <ul className="-mx-2 space-y-1">
                  {state.hits.map((h) => (
                    <ResultRow
                      key={h.slide.slide_id}
                      hit={h}
                      onOpen={() => setOpen(h.slide)}
                      selecting={selectMode}
                      selected={selected.has(h.slide.slide_id)}
                      onToggle={() => toggle(h.slide.slide_id)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      {selectMode && tab === "search" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas px-4 pt-3 pb-safe">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <p className="flex-1 text-[15px] text-muted tabular-nums">
              {selectedSlides.length ? `${selectedSlides.length} selected` : `Tap ${noun}s to select`}
            </p>
            <button
              type="button"
              disabled={selectedSlides.length === 0}
              onClick={() => setDownloading(selectedSlides)}
              className="flex h-14 items-center gap-2.5 rounded-2xl bg-accent px-6 text-[17px] font-semibold text-on-accent transition-transform active:scale-[0.98] disabled:bg-raised disabled:text-muted"
            >
              <DownloadIcon size={22} />
              Download ({selectedSlides.length})
            </button>
          </div>
        </div>
      )}
      {downloading && (
        <DownloadSheet
          title="Download selected"
          load={async () => [{ id: "selected", label: "Selected", items: downloading }]}
          zipName={() => `${room || "backrow"}-search.zip`}
          onClose={() => setDownloading(null)}
        />
      )}
      <SlideModal slide={open} onClose={() => setOpen(null)} />
    </main>
  );
}
