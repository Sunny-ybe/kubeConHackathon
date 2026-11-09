"use client";
import { formatTime } from "@/lib/config";
import type { Slide } from "@/lib/types";
import { ClockIcon } from "@/components/icons";
import SlideImage from "./SlideImage";

type Props = { slide: Slide; index: number; onOpen: (slide: Slide) => void };

export default function SlideCard({ slide, index, onOpen }: Props) {
  const snaps = slide.snaps ?? 1;
  const title = slide.title || (slide.kind === "photo" ? "Untitled photo" : "Untitled slide");
  const waiting = slide.status === "pending";
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}>
      <button
        type="button"
        onClick={() => onOpen(slide)}
        aria-label={`${title}${snaps > 1 ? `, snapped ${snaps} times` : ""}${waiting ? ", waiting for host" : ""}. Open ${slide.kind === "photo" ? "photo" : "slide"}`}
        className="group block w-full rounded-2xl text-left transition-transform active:scale-[0.985]"
      >
        <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-surface transition-colors group-hover:border-line-strong">
          <SlideImage slide={slide} size="thumb" />
          {waiting && (
            <span className="absolute top-2.5 left-2.5 flex h-7 items-center gap-1.5 rounded-full border border-line-strong bg-canvas/85 pr-2.5 pl-2 text-[13px] font-medium text-fg">
              <ClockIcon size={15} className="text-muted" />
              Waiting for host
            </span>
          )}
          {snaps > 1 && (
            <span
              key={snaps}
              className="absolute top-2.5 right-2.5 animate-badge rounded-full bg-accent px-2.5 py-0.5 text-[13px] leading-6 font-semibold text-on-accent tabular-nums"
            >
              ×{snaps}
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 text-[17px] leading-snug font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 truncate text-sm text-muted">
          {slide.talk_title || "Open session"}
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">{formatTime(slide.taken_at)}</span>
          {slide.mine && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-fg/80">You</span>
            </>
          )}
        </p>
      </button>
    </li>
  );
}

export function SlideCardSkeleton() {
  return (
    <li aria-hidden="true">
      <div className="shimmer aspect-video rounded-xl" />
      <div className="shimmer mt-3 h-[18px] w-4/5 rounded-md" />
      <div className="shimmer mt-2 h-3.5 w-1/2 rounded-md" />
    </li>
  );
}
