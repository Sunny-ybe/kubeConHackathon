"use client";
import { useEffect, useState } from "react";
import { formatTime } from "@/lib/config";
import type { Slide } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon, SpeakerIcon, StopIcon } from "@/components/icons";
import { useSpeech } from "@/components/hooks/useSpeech";

type Props = { slides: Slide[] | null; compact?: boolean };

/** Slide text without a first line that just repeats the title. */
function body(s: Slide) {
  const lines = s.text.split("\n");
  if (lines[0]?.trim().toLowerCase() === s.title.trim().toLowerCase()) lines.shift();
  return lines.join("\n").trim();
}

function readable(s: Slide) {
  if (s.kind === "photo") return [s.title, body(s) || s.alt_text].filter(Boolean).join(".\n");
  return [s.title, body(s), s.alt_text && `Diagram: ${s.alt_text}`].filter(Boolean).join(".\n");
}

/**
 * Big-text carousel. Index 0 is the newest cluster; when a new cluster_id lands on top it
 * jumps back to it, and Auto-read speaks it.
 */
export default function EasyReader({ slides, compact }: Props) {
  const { speaking, speak, stop } = useSpeech();
  const [index, setIndex] = useState(0);
  const [autoRead, setAutoRead] = useState(false);
  const topId = slides?.[0]?.cluster_id ?? null;
  const [seenTop, setSeenTop] = useState(topId);

  // A new slide on top: go back to the newest (state adjusted during render, no effect needed).
  if (topId !== seenTop) {
    setSeenTop(topId);
    setIndex(0);
  }

  const current = slides?.[Math.min(index, (slides?.length ?? 1) - 1)] ?? null;

  useEffect(() => {
    if (autoRead && slides?.[0] && topId) speak(readable(slides[0]), "en-US");
    // Only when the top cluster changes; slides polls every few seconds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topId]);

  function toggleRead() {
    if (speaking) stop();
    else if (current) speak(readable(current), "en-US");
  }

  function toggleAuto() {
    const next = !autoRead;
    setAutoRead(next);
    // The tap also unlocks speech on iOS, so later auto-reads can play.
    if (next && current) speak(readable(current), "en-US");
    else stop();
  }

  const total = slides?.length ?? 0;
  const heading = compact ? "text-[26px] sm:text-[30px]" : "text-[32px] sm:text-[36px]";
  const bodySize = compact ? "text-[24px] sm:text-[28px]" : "text-[28px] sm:text-[32px]";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] text-white/60 tabular-nums">
          {current ? (index === 0 ? "Newest slide" : `${index + 1} of ${total}`) : " "}
          {current && <span className="text-white/40"> · {formatTime(current.taken_at)}</span>}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={autoRead}
          onClick={toggleAuto}
          className="flex min-h-12 shrink-0 items-center gap-3 rounded-full pl-3 text-[15px] font-medium whitespace-nowrap text-white"
        >
          Auto-read
          <span
            aria-hidden="true"
            className={`relative h-7 w-12 rounded-full transition-colors ${autoRead ? "bg-success" : "bg-white/20"}`}
          >
            <span
              className={`absolute top-1 left-1 size-5 rounded-full transition-transform ${
                autoRead ? "translate-x-5 bg-black" : "bg-white"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
        {slides === null ? (
          <div className="max-w-[38ch] space-y-4" aria-hidden="true">
            <div className="h-9 w-3/4 animate-blink rounded-lg bg-white/10" />
            <div className="h-7 w-full animate-blink rounded-lg bg-white/10" />
            <div className="h-7 w-5/6 animate-blink rounded-lg bg-white/10" />
          </div>
        ) : current ? (
          <article key={current.cluster_id} className="animate-fade max-w-[38ch]" aria-live="polite">
            <h2 className={`${heading} leading-[1.15] font-semibold tracking-tight text-balance text-white`}>
              {current.title || "Untitled slide"}
            </h2>
            {body(current) && (
              <p className={`${bodySize} mt-6 leading-[1.4] whitespace-pre-line text-white`}>{body(current)}</p>
            )}
            {current.alt_text && (
              <p className="mt-8 border-l-2 border-white/25 pl-5 text-[22px] leading-normal text-white/70 sm:text-2xl">
                {current.alt_text}
              </p>
            )}
          </article>
        ) : (
          <p className={`${bodySize} max-w-[30ch] leading-snug text-white/60`}>
            No slides yet. The first snap in this room will appear here.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
          disabled={index >= total - 1}
          aria-label="Older slide"
          className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/15 text-white disabled:opacity-30"
        >
          <ChevronLeftIcon size={26} />
        </button>
        <button
          type="button"
          onClick={toggleRead}
          disabled={!current}
          aria-pressed={speaking}
          className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-white text-xl font-semibold text-black active:scale-[0.98] disabled:opacity-40"
        >
          {speaking ? <StopIcon size={26} /> : <SpeakerIcon size={26} />}
          {speaking ? "Stop" : "Read aloud"}
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
          aria-label="Newer slide"
          className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/15 text-white disabled:opacity-30"
        >
          <ChevronRightIcon size={26} />
        </button>
      </div>
    </div>
  );
}
