"use client";
// Small shared pieces for Ask, search, /me and the trip report.
import Link from "next/link";
import { useState } from "react";
import schedule from "@/data/schedule.json";
import type { Slide } from "@/lib/types";
import { formatTime } from "@/lib/config";

const ROOM_NAMES: Record<string, string> = Object.fromEntries(schedule.rooms.map((r) => [r.room, r.name]));

export function roomName(room: string): string {
  return ROOM_NAMES[room] ?? room;
}

/** "Talk · Room · 2:41 PM", skipping empty parts. */
export function slideMeta(s: Slide): string {
  return [s.talk_title, roomName(s.room), formatTime(s.taken_at)].filter(Boolean).join(" · ");
}

/** Shimmering placeholder block. Size it with className. Holds still under reduced motion. */
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <>
      <style href="backrow-shimmer" precedence="default">{`
        @keyframes backrow-shimmer { from { background-position: 150% 0 } to { background-position: -50% 0 } }
        .backrow-shimmer {
          background-color: var(--color-raised);
          background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
          background-size: 200% 100%;
          background-repeat: no-repeat;
          animation: backrow-shimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) { .backrow-shimmer { animation: none } }
      `}</style>
      <div aria-hidden="true" className={`backrow-shimmer rounded-md ${className}`} />
    </>
  );
}

const TILE = {
  sm: { pad: "p-1.5", text: "text-[9px] line-clamp-2", bar: "w-3" },
  md: { pad: "p-2.5", text: "text-[13px] line-clamp-2", bar: "w-6" },
  lg: { pad: "p-5 sm:p-6", text: "text-2xl line-clamp-3", bar: "w-10" },
};

/**
 * 16:9 slide thumbnail. The designed text tile is always underneath; the photo fades in
 * over it once loaded and is dropped if it fails, so there's never a broken image.
 */
export function SlideThumb({
  slide,
  className = "",
  size = "md",
}: {
  slide: Slide;
  className?: string;
  size?: keyof typeof TILE;
}) {
  const src = size === "lg" ? slide.image_url || slide.thumb_url : slide.thumb_url;
  const [state, setState] = useState<"loading" | "ok" | "failed">(src ? "loading" : "failed");
  const t = TILE[size];
  return (
    <div className={`tile-grid relative aspect-video overflow-hidden rounded-lg border border-line ${className}`}>
      <div className={`flex h-full flex-col justify-between ${t.pad}`} aria-hidden="true">
        <p className={`font-semibold leading-snug text-fg ${t.text}`}>
          {slide.title || slide.text.split("\n")[0] || "Untitled slide"}
        </p>
        <span className={`h-0.5 rounded-full bg-accent ${t.bar}`} />
      </div>
      {state !== "failed" && src && (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own API, already resized
        <img
          src={src}
          alt={slide.title || "Slide photo"}
          loading="lazy"
          onLoad={() => setState("ok")}
          onError={() => setState("failed")}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${
            state === "ok" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

/** Accent [S#] chip. The ::after pad gives it a 48px tap area without breaking the line. */
export function CitationChip({ label, slide, onOpen }: { label: string; slide?: Slide; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Slide ${label.replace(/^S/, "")}: ${slide?.title || "untitled"}`}
      className="relative mx-0.5 inline-flex items-center rounded-md bg-accent/15 px-1.5 py-px align-baseline text-[0.8em] font-semibold tabular-nums text-accent transition-colors after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:bg-accent/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {label}
    </button>
  );
}

/** Slim top bar for /search and /me: home link plus the other page. */
export function PageHeader({ current }: { current: "search" | "me" }) {
  const link =
    "inline-flex h-12 items-center rounded-lg px-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <header className="flex items-center justify-between py-2">
      <Link href="/" className={`${link} -ml-3 text-lg font-semibold tracking-tight text-fg`}>
        Backrow
      </Link>
      <nav className="-mr-3 flex" aria-label="Main">
        <Link
          href="/search"
          aria-current={current === "search" ? "page" : undefined}
          className={`${link} ${current === "search" ? "text-fg" : "text-muted hover:text-fg"}`}
        >
          Search
        </Link>
        <Link
          href="/me"
          aria-current={current === "me" ? "page" : undefined}
          className={`${link} ${current === "me" ? "text-fg" : "text-muted hover:text-fg"}`}
        >
          My slides
        </Link>
      </nav>
    </header>
  );
}
