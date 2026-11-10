"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import AskPanel from "@/components/ask/AskPanel";
import EasyReader from "@/components/easy/EasyReader";
import DownloadSheet from "@/components/download/DownloadSheet";
import { BackrowMark, CameraIcon, CloseIcon, ClockIcon, DownloadIcon, ExpandIcon, QrIcon, SearchIcon, StackIcon } from "@/components/icons";
import { useFeed } from "@/components/hooks/useFeed";
import { usePending } from "@/components/hooks/usePending";
import PendingPanel from "@/components/rooms/PendingPanel";
import { useSharePref } from "@/components/hooks/useSharePref";
import SlideCard, { SlideCardSkeleton } from "@/components/slide/SlideCard";
import SlideSheet from "@/components/slide/SlideSheet";
import { MAX_BATCH_UPLOAD, formatTime } from "@/lib/config";
import { getMedia, getRoom, snap } from "@/lib/client";
import type { SharePref } from "@/lib/device";
import type { RoomResponse, Slide, Talk } from "@/lib/types";
import PeopleMenu from "./PeopleMenu";
import ShareModal from "./ShareModal";
import ShareToggle from "./ShareToggle";
import SnapBar from "./SnapBar";
import { SnapErrorCard, SnapLoadingCard, UploadProgressCard } from "./SnapStatusCard";

type TabId = "feed" | "pending" | "easy" | "ask";
const TABS: { id: TabId; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "easy", label: "Easy read" },
  { id: "ask", label: "Ask" },
];
const HOST_TABS: { id: TabId; label: string }[] = [TABS[0], { id: "pending", label: "Pending" }, ...TABS.slice(1)];

const HOSTED_LINES = ["Reading the photo…", "Writing a description…", "Adding it to the room…"];
const GUEST_LINES = ["Reading the photo…", "Writing a description…", "Sending it to the host…"];

type SnapState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "batch"; current: number; total: number }
  | { status: "error"; message: string };
type Notice = { title: string; body: string };

type Props = { room: string; roomName: string; hosted: boolean; fallbackTalk: Talk | null };

export default function RoomView({ room, roomName, hosted: hostedAtLoad, fallbackTalk }: Props) {
  const { data, failed, announcement, refresh } = useFeed(room);
  const [roomInfo, setRoomInfo] = useState<RoomResponse | null>(null);
  const [tab, setTab] = useState<TabId>("feed");
  const [snapState, setSnapState] = useState<SnapState>({ status: "idle" });
  const [mySnaps, setMySnaps] = useState<Slide[]>([]);
  const [open, setOpen] = useState<Slide | null>(null);
  const [asking, setAsking] = useState(false);
  const [resultNote, setResultNote] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharePref, setSharePref] = useSharePref();
  const fileRef = useRef<HTMLInputElement>(null);
  const rollRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    getRoom(room)
      .then(setRoomInfo)
      .catch(() => setRoomInfo(null));
  }, [room]);

  const hosted = roomInfo ? !!roomInfo.hosted : hostedAtLoad;
  const host = hosted && !!roomInfo?.host;
  // Approving shows the photo in the host's feed at once, before the server round trip.
  const onApproved = useCallback(
    (slide: Slide, ok: boolean) => {
      setMySnaps((prev) => [
        ...(ok ? [{ ...slide, status: "approved" as const }] : []),
        ...prev.filter((s) => s.slide_id !== slide.slide_id),
      ]);
    },
    [],
  );
  const pending = usePending(room, host, onApproved);
  const pendingCount = pending.slides?.length ?? roomInfo?.pending_count ?? 0;
  const tabs = host ? HOST_TABS : TABS;
  const name = roomInfo?.room_name || roomName;
  const talk = data?.talk ?? roomInfo?.talk ?? fallbackTalk;
  const feedIds = new Set(data?.slides.map((s) => s.cluster_id));
  const slides = data ? [...mySnaps.filter((s) => !feedIds.has(s.cluster_id)), ...data.slides] : null;

  function startSnap() {
    // Hosted rooms always share (the host's approval is the guardrail), so don't ask.
    if (sharePref === null && !hosted) setAsking(true);
    else fileRef.current?.click();
  }

  function chooseShare(pref: SharePref) {
    setSharePref(pref);
    setAsking(false);
    // Still inside the tap, so the camera is allowed to open.
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTab("feed");
    setResultNote("");
    setNotice(null);
    setSnapState({ status: "loading" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const res = await snap(file, room);
    if (res.ok) {
      const slide: Slide = {
        ...res.slide,
        snaps: res.cluster_size,
        mine: true,
        ...(res.pending ? { status: "pending" as const } : {}),
      };
      setMySnaps((prev) => [slide, ...prev.filter((s) => s.cluster_id !== slide.cluster_id)]);
      setSnapState({ status: "idle" });
      if (res.pending) {
        // Guests in a hosted room: no sheet, just a clear "sent" note on top of the feed.
        setNotice({ title: "Sent to the host.", body: "It appears for everyone once approved." });
        setResultNote("Sent to the host. It appears for everyone once approved.");
      } else {
        setResultNote(
          hosted
            ? `Added “${slide.title || "your photo"}” to the room.`
            : `Saved “${slide.title || "your slide"}”. Snapped by ${res.cluster_size} ${res.cluster_size === 1 ? "person" : "people"}.`,
        );
        setOpen(slide);
      }
      refresh();
    } else {
      setSnapState({
        status: "error",
        message:
          res.reason === "not_a_slide"
            ? "That doesn't look like a slide. Try again?"
            : res.reason === "too_large"
              ? "That photo is too large. Try again?"
              : hosted
                ? "Couldn't add that photo. Try again?"
                : "Couldn't save that snap. Try again?",
      });
    }
  }

  /** Upload photos: up to MAX_BATCH_UPLOAD from the camera roll, one at a time, then one summary. */
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])];
    e.target.value = "";
    if (picked.length === 0) return;
    const files = picked.slice(0, MAX_BATCH_UPLOAD);
    setTab("feed");
    setResultNote("");
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    let added = 0;
    let waiting = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setSnapState({ status: "batch", current: i + 1, total: files.length });
      setResultNote(`Uploading ${i + 1} of ${files.length}…`);
      const res = await snap(files[i], room);
      if (!res.ok) {
        failed++;
        continue;
      }
      const slide: Slide = {
        ...res.slide,
        snaps: res.cluster_size,
        mine: true,
        ...(res.pending ? { status: "pending" as const } : {}),
      };
      if (res.pending) waiting++;
      else added++;
      setMySnaps((prev) => [slide, ...prev.filter((s) => s.cluster_id !== slide.cluster_id)]);
    }
    setSnapState({ status: "idle" });
    refresh();
    const ok = added + waiting;
    const photos = (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`;
    const extra = [
      failed > 0 ? `${photos(failed)} couldn't be uploaded. Try ${failed === 1 ? "it" : "them"} again.` : "",
      picked.length > files.length ? `Only the first ${MAX_BATCH_UPLOAD} were sent.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const next: Notice =
      ok === 0
        ? { title: "Nothing was uploaded.", body: extra || "Check your connection and try again." }
        : waiting > 0
          ? { title: `Sent ${photos(ok)} to the host.`, body: `They appear for everyone once approved. ${extra}`.trim() }
          : { title: `Added ${photos(ok)} to the room.`, body: extra };
    setNotice(next);
    setResultNote(`${next.title} ${next.body}`.trim());
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const j = (next + tabs.length) % tabs.length;
    setTab(tabs[j].id);
    tabRefs.current[j]?.focus();
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="-ml-2 flex min-h-12 items-center gap-2.5 rounded-lg px-2 font-semibold tracking-tight"
            aria-label="Backrow home"
          >
            <BackrowMark />
            <span className="hidden text-[17px] min-[430px]:inline">Backrow</span>
          </Link>
          <div className="-mr-2 flex items-center">
            {hosted ? (
              <Link
                href={`/r/${encodeURIComponent(room)}/share`}
                className="mr-1 flex min-h-12 items-center rounded-full px-1 text-sm font-medium"
              >
                <span className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 transition-colors hover:bg-surface">
                  <QrIcon size={17} className="text-muted" />
                  Share
                  <span className="sr-only"> room QR code</span>
                </span>
              </Link>
            ) : (
              <ShareToggle />
            )}
            <Link
              href={`/search?room=${encodeURIComponent(room)}`}
              aria-label={hosted ? "Search this room's photos" : "Search this room's slides"}
              className="grid size-12 place-items-center rounded-full text-muted transition-colors hover:text-fg"
            >
              <SearchIcon size={22} />
            </Link>
            <PeopleMenu room={room} />
            <Link
              href="/me"
              aria-label="My slides"
              className="grid size-12 place-items-center rounded-full text-muted transition-colors hover:text-fg"
            >
              <StackIcon size={22} />
            </Link>
          </div>
        </div>

        {hosted ? (
          <div className="pt-5 pb-6 sm:pt-8 sm:pb-8">
            {host ? (
              <p className="inline-flex h-7 items-center gap-2 rounded-full border border-line-strong px-3 text-[13px] font-medium tracking-wide">
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                You&apos;re hosting
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[13px] font-medium tracking-wider text-muted uppercase">
                <span className="size-2 animate-blink rounded-full bg-success" aria-hidden="true" />
                Hosted room
              </p>
            )}
            <h1 className="mt-3 line-clamp-3 text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance break-words sm:text-[52px]">
              {name}
            </h1>
            <p className="mt-2 max-w-[46ch] text-[15px] text-muted">
              {host
                ? "Your photos go up at once. Approve guests' photos under Pending."
                : "Add any photo. The host approves what everyone sees."}
            </p>
          </div>
        ) : (
        <div className="pt-5 pb-6 sm:pt-8 sm:pb-8">
          <p className="flex items-center gap-2 text-[13px] font-medium tracking-wider text-muted uppercase">
            {talk ? (
              <span className="size-2 animate-blink rounded-full bg-success" aria-hidden="true" />
            ) : null}
            {roomName}
          </p>
          {talk ? (
            <>
              <h1 className="mt-2 line-clamp-3 text-[28px] leading-[1.12] font-semibold tracking-tight text-balance sm:text-[40px]">
                {talk.title}
              </h1>
              <p className="mt-2 text-[15px] text-muted">
                {talk.speakers}
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">
                  {formatTime(talk.start)}–{formatTime(talk.end)}
                </span>
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight sm:text-[40px]">
                No talk on right now
              </h1>
              <p className="mt-2 text-[15px] text-muted">Snaps still land in this room.</p>
            </>
          )}
        </div>
        )}
      </header>

      <div className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div
          role="tablist"
          aria-label="Room views"
          onKeyDown={onTabKey}
          className="mx-auto flex max-w-6xl px-4 sm:gap-2 sm:px-5"
        >
          {tabs.map((t, i) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`relative h-12 flex-1 text-[15px] font-medium transition-colors sm:min-w-16 sm:flex-none sm:px-3 ${
                  active ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {t.label}
                {t.id === "pending" && (
                  <span
                    key={pendingCount}
                    className={`ml-1.5 inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 align-[1px] text-[13px] font-semibold tabular-nums ${
                      pendingCount > 0 ? "animate-badge bg-accent text-on-accent" : "bg-raised text-muted"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent transition-opacity sm:inset-x-3 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <main
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mx-auto max-w-6xl px-4 pt-6 pb-36 sm:px-8 sm:pt-8"
      >
        {tab === "feed" && (
          <>
            {failed && !data && (
              <p className="mb-6 text-[15px] text-muted" role="status">
                Can&apos;t reach the room right now. Trying again…
              </p>
            )}
            {notice && (
              <div className="animate-rise mb-6 flex max-w-xl items-start gap-3 rounded-xl border border-line-strong bg-surface py-3 pr-1 pl-4">
                <ClockIcon size={22} className="mt-0.5 shrink-0 text-accent" />
                <p className="flex-1 py-0.5 text-[15px] leading-snug">
                  <span className="font-semibold">{notice.title}</span>{" "}
                  <span className="text-muted">{notice.body}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss"
                  className="-my-2 grid size-12 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            )}
            {slides && slides.length > 0 && (
              <div className="-mt-2 mb-4 flex items-center justify-between gap-3">
                <p className="text-[15px] text-muted">Newest first</p>
                <button
                  type="button"
                  onClick={() => setDownloading(true)}
                  className="-mr-1 flex min-h-12 items-center px-1 text-[15px] font-medium"
                >
                  <span className="flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 transition-colors hover:bg-surface">
                    <DownloadIcon size={18} className="text-muted" />
                    Download
                  </span>
                </button>
              </div>
            )}
            {slides && slides.length === 0 && snapState.status === "idle" ? (
              <div className="grid aspect-video max-w-xl place-items-center rounded-xl border border-dashed border-line-strong px-6 text-center">
                <div>
                  <CameraIcon size={28} className="mx-auto text-muted" />
                  <p className="mt-3 text-lg font-medium tracking-tight">
                    {!hosted
                      ? "No slides yet. Be the first to snap one."
                      : host
                        ? "No photos yet. Share the QR to get people in."
                        : "No photos yet. Be the first to add one."}
                  </p>
                  {host && (
                    <Link
                      href={`/r/${encodeURIComponent(room)}/share`}
                      className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl border border-line-strong px-4 font-medium transition-colors hover:bg-surface"
                    >
                      <QrIcon className="text-muted" />
                      Show the QR
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {snapState.status === "batch" && (
                  <UploadProgressCard current={snapState.current} total={snapState.total} />
                )}
                {snapState.status === "loading" && (
                  <SnapLoadingCard lines={!hosted ? undefined : host ? HOSTED_LINES : GUEST_LINES} />
                )}
                {snapState.status === "error" && (
                  <SnapErrorCard
                    message={snapState.message}
                    onRetry={startSnap}
                    onDismiss={() => setSnapState({ status: "idle" })}
                  />
                )}
                {slides
                  ? slides.map((s, i) => <SlideCard key={s.cluster_id} slide={s} index={i} onOpen={setOpen} />)
                  : [0, 1, 2].map((i) => <SlideCardSkeleton key={i} />)}
              </ul>
            )}
          </>
        )}

        {tab === "pending" && host && (
          <PendingPanel room={room} slides={pending.slides} error={pending.error} onAct={pending.act} onOpen={setOpen} />
        )}

        {tab === "easy" && (
          <div>
            <div className="mb-3 flex justify-end">
              <Link
                href={`/r/${encodeURIComponent(room)}/easy`}
                className="flex min-h-12 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:text-fg"
              >
                <ExpandIcon size={18} />
                Full screen
              </Link>
            </div>
            <div className="flex flex-col rounded-3xl border border-line bg-black p-6 sm:p-10">
              <EasyReader slides={slides} compact />
            </div>
          </div>
        )}

        {tab === "ask" && <AskPanel room={room} talkId={talk?.talk_id} />}
      </main>

      <p className="sr-only" aria-live="polite">
        {resultNote || pending.announcement || announcement}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
        tabIndex={-1}
        aria-label="Snap a slide"
      />
      {hosted && (
        <input
          ref={rollRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          className="hidden"
          tabIndex={-1}
          aria-label="Upload photos"
        />
      )}
      {(tab === "feed" || tab === "easy") && (
        <SnapBar
          busy={snapState.status === "loading" || snapState.status === "batch"}
          onSnap={startSnap}
          onUpload={hosted ? () => rollRef.current?.click() : undefined}
          label={hosted ? "Snap" : undefined}
        />
      )}
      {asking && <ShareModal onChoose={chooseShare} onCancel={() => setAsking(false)} />}
      {downloading && (
        <DownloadSheet
          title={hosted ? "Download photos" : "Download slides"}
          load={async () => {
            const [mine, all] = await Promise.all([getMedia(room, "mine"), getMedia(room, "all")]);
            return [
              { id: "mine", label: hosted ? "My photos" : "My slides", items: mine.items },
              { id: "all", label: hosted ? "All photos" : "All slides", items: all.items },
            ];
          }}
          zipName={(o) => `${room}-${o.id === "mine" ? "mine" : "all"}.zip`}
          onClose={() => setDownloading(false)}
        />
      )}
      {open && <SlideSheet slide={open} roomName={name} onClose={() => setOpen(null)} />}
    </div>
  );
}
