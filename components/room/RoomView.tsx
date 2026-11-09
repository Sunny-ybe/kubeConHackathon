"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import AskPanel from "@/components/ask/AskPanel";
import { BackrowMark, CameraIcon, ExpandIcon, SearchIcon, StackIcon } from "@/components/icons";
import { useFeed } from "@/components/hooks/useFeed";
import { useSharePref } from "@/components/hooks/useSharePref";
import SlideCard, { SlideCardSkeleton } from "@/components/slide/SlideCard";
import { formatTime } from "@/lib/config";
import { getRoom, snap } from "@/lib/client";
import type { SharePref } from "@/lib/device";
import type { Slide, Talk } from "@/lib/types";
import ShareModal from "./ShareModal";
import ShareToggle from "./ShareToggle";
import SnapBar from "./SnapBar";
import { SnapErrorCard, SnapLoadingCard } from "./SnapStatusCard";

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "easy", label: "Easy read" },
  { id: "ask", label: "Ask" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type SnapState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string };

type Props = { room: string; roomName: string; fallbackTalk: Talk | null };

export default function RoomView({ room, roomName, fallbackTalk }: Props) {
  const { data, failed, announcement, refresh } = useFeed(room);
  const [roomTalk, setRoomTalk] = useState<Talk | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>("feed");
  const [snapState, setSnapState] = useState<SnapState>({ status: "idle" });
  const [mySnaps, setMySnaps] = useState<Slide[]>([]);
  const [asking, setAsking] = useState(false);
  const [resultNote, setResultNote] = useState("");
  const [sharePref, setSharePref] = useSharePref();
  const fileRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    getRoom(room)
      .then((r) => setRoomTalk(r.talk))
      .catch(() => setRoomTalk(null));
  }, [room]);

  const talk = data?.talk ?? roomTalk ?? fallbackTalk;
  const feedIds = new Set(data?.slides.map((s) => s.cluster_id));
  const slides = data ? [...mySnaps.filter((s) => !feedIds.has(s.cluster_id)), ...data.slides] : null;

  function startSnap() {
    if (sharePref === null) setAsking(true);
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
    setSnapState({ status: "loading" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const res = await snap(file, room);
    if (res.ok) {
      const slide = { ...res.slide, snaps: res.cluster_size, mine: true };
      setMySnaps((prev) => [slide, ...prev.filter((s) => s.cluster_id !== slide.cluster_id)]);
      setSnapState({ status: "idle" });
      setResultNote(
        `Saved “${slide.title || "your slide"}”. Snapped by ${res.cluster_size} ${res.cluster_size === 1 ? "person" : "people"}.`,
      );
      refresh();
    } else {
      setSnapState({
        status: "error",
        message:
          res.reason === "not_a_slide"
            ? "That doesn't look like a slide. Try again?"
            : res.reason === "too_large"
              ? "That photo is too large. Try again?"
              : "Couldn't save that snap. Try again?",
      });
    }
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const j = (next + TABS.length) % TABS.length;
    setTab(TABS[j].id);
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
            <span className="hidden text-[17px] min-[380px]:inline">Backrow</span>
          </Link>
          <div className="-mr-2 flex items-center">
            <ShareToggle />
            <Link
              href="/search"
              aria-label="Search slides"
              className="grid size-12 place-items-center rounded-full text-muted transition-colors hover:text-fg"
            >
              <SearchIcon size={22} />
            </Link>
            <Link
              href="/me"
              aria-label="My slides"
              className="grid size-12 place-items-center rounded-full text-muted transition-colors hover:text-fg"
            >
              <StackIcon size={22} />
            </Link>
          </div>
        </div>

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
      </header>

      <div className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div
          role="tablist"
          aria-label="Room views"
          onKeyDown={onTabKey}
          className="mx-auto flex max-w-6xl px-4 sm:gap-6 sm:px-8"
        >
          {TABS.map((t, i) => {
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
                className={`relative h-12 flex-1 text-[15px] font-medium transition-colors sm:flex-none sm:px-1 ${
                  active ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {t.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent transition-opacity sm:inset-x-0 ${
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
            {slides && slides.length === 0 && snapState.status === "idle" ? (
              <div className="grid aspect-video max-w-xl place-items-center rounded-xl border border-dashed border-line-strong px-6 text-center">
                <div>
                  <CameraIcon size={28} className="mx-auto text-muted" />
                  <p className="mt-3 text-lg font-medium tracking-tight">No slides yet. Be the first to snap one.</p>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {snapState.status === "loading" && <SnapLoadingCard />}
                {snapState.status === "error" && (
                  <SnapErrorCard
                    message={snapState.message}
                    onRetry={startSnap}
                    onDismiss={() => setSnapState({ status: "idle" })}
                  />
                )}
                {slides
                  ? slides.map((s, i) => <SlideCard key={s.cluster_id} slide={s} index={i} onOpen={() => {}} />)
                  : [0, 1, 2].map((i) => <SlideCardSkeleton key={i} />)}
              </ul>
            )}
          </>
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
            <p className="text-lg text-muted">Big-text reading view for this room.</p>
          </div>
        )}

        {tab === "ask" && <AskPanel room={room} talkId={talk?.talk_id} />}
      </main>

      <p className="sr-only" aria-live="polite">
        {resultNote || announcement}
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
      {tab !== "ask" && <SnapBar busy={snapState.status === "loading"} onSnap={startSnap} />}
      {asking && <ShareModal onChoose={chooseShare} onCancel={() => setAsking(false)} />}
    </div>
  );
}
