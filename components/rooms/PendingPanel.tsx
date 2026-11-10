"use client";
import Link from "next/link";
import { CheckIcon, CloseIcon, QrIcon } from "@/components/icons";
import SlideImage from "@/components/slide/SlideImage";
import VideoBadge from "@/components/slide/VideoBadge";
import { formatTime } from "@/lib/config";
import type { Slide } from "@/lib/types";

type Props = {
  room: string;
  slides: Slide[] | null;
  error: string;
  onAct: (slide: Slide, action: "approve" | "reject") => void;
  onOpen: (slide: Slide) => void;
};

/** Host only: guest uploads waiting for approval, with big Approve / Reject buttons. */
export default function PendingPanel({ room, slides, error, onAct, onOpen }: Props) {
  return (
    <>
      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-accent/30 px-4 py-3 text-[15px] text-fg">
          {error}
        </p>
      )}
      {slides && slides.length === 0 ? (
        <div className="grid min-h-64 max-w-xl place-items-center rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
          <div>
            <CheckIcon size={28} className="mx-auto text-success" />
            <p className="mt-3 text-lg font-medium tracking-tight">All caught up.</p>
            <p className="mt-1 text-[15px] text-muted">New photos from guests wait here for you.</p>
            <Link
              href={`/r/${encodeURIComponent(room)}/share`}
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl border border-line-strong px-4 font-medium transition-colors hover:bg-surface"
            >
              <QrIcon className="text-muted" />
              Show the QR
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {slides
            ? slides.map((s, i) => <PendingCard key={s.slide_id} slide={s} index={i} onAct={onAct} onOpen={onOpen} />)
            : [0, 1].map((i) => <PendingSkeleton key={i} />)}
        </ul>
      )}
    </>
  );
}

type CardProps = { slide: Slide; index: number; onAct: Props["onAct"]; onOpen: Props["onOpen"] };

function PendingCard({ slide, index, onAct, onOpen }: CardProps) {
  const title = slide.title || (slide.kind === "photo" ? "Untitled photo" : "Untitled slide");
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}>
      <button
        type="button"
        onClick={() => onOpen(slide)}
        aria-label={`${title}. Open to see it full size`}
        className="group block w-full rounded-2xl text-left"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface transition-colors group-hover:border-line-strong">
          <SlideImage slide={slide} size="thumb" />
          {slide.media === "video" && <VideoBadge duration={slide.duration_s} />}
        </div>
        <h3 className="mt-3 line-clamp-2 text-[17px] leading-snug font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
          <span className="tabular-nums">{formatTime(slide.taken_at)}</span>
          {slide.alt_text && (
            <>
              <span aria-hidden="true"> · </span>
              {slide.alt_text}
            </>
          )}
        </p>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onAct(slide, "reject")}
          aria-label={`Reject ${title}`}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line-strong text-[17px] font-semibold transition-colors hover:bg-surface active:scale-[0.98]"
        >
          <CloseIcon size={20} className="text-muted" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => onAct(slide, "approve")}
          aria-label={`Approve ${title}`}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-[17px] font-semibold text-on-accent transition-transform active:scale-[0.98]"
        >
          <CheckIcon size={20} />
          Approve
        </button>
      </div>
    </li>
  );
}

function PendingSkeleton() {
  return (
    <li aria-hidden="true">
      <div className="shimmer aspect-[4/3] rounded-xl" />
      <div className="shimmer mt-3 h-[18px] w-3/4 rounded-md" />
      <div className="shimmer mt-2 h-3.5 w-1/2 rounded-md" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="shimmer h-14 rounded-2xl" />
        <div className="shimmer h-14 rounded-2xl" />
      </div>
    </li>
  );
}
