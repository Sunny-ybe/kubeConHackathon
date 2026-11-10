"use client";
import { useEffect, useState } from "react";
import { AlertIcon, CameraIcon, CloseIcon, ImageIcon, PlayIcon } from "@/components/icons";
import type { VideoProgress } from "@/lib/client";

const LINES = ["Reading the slide…", "Finding the talk…", "Checking who else snapped it…"];

/** Shaped like a slide card while /api/snap works; cycles the SPEC §2 status lines. */
export function SnapLoadingCard({ lines = LINES }: { lines?: readonly string[] }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % lines.length), 1700);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <li className="animate-rise">
      <div className="shimmer relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-accent/30">
        <span className="grid size-14 place-items-center rounded-full border border-line-strong bg-canvas/60 text-accent">
          <CameraIcon size={26} className="animate-blink" />
        </span>
      </div>
      <div role="status" aria-live="polite" className="mt-3">
        <p key={step} className="animate-fade text-[17px] leading-snug font-semibold tracking-tight">
          {lines[step % lines.length]}
        </p>
      </div>
      <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
        {lines.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-line-strong"}`}
          />
        ))}
      </div>
    </li>
  );
}

/** Upload photos: "Uploading 3 of 8…" with a progress bar, shaped like a card. */
export function UploadProgressCard({ current, total }: { current: number; total: number }) {
  return (
    <li className="animate-rise">
      <div className="shimmer relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-accent/30">
        <span className="grid size-14 place-items-center rounded-full border border-line-strong bg-canvas/60 text-accent">
          <ImageIcon size={26} className="animate-blink" />
        </span>
      </div>
      <p className="mt-3 text-[17px] leading-snug font-semibold tracking-tight tabular-nums">
        Uploading {current} of {total}…
      </p>
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current - 1}
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-line-strong"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${((current - 0.5) / total) * 100}%` }}
        />
      </div>
    </li>
  );
}

/** One video: "Checking the video…", "Uploading video… 42%", "Reading the video…". In a batch, "3 of 8" on top. */
export function VideoUploadCard({ progress, current, total }: { progress: VideoProgress; current?: number; total?: number }) {
  const percent = progress.stage === "uploading" ? progress.percent : progress.stage === "reading" ? 100 : 0;
  const line =
    progress.stage === "checking"
      ? "Checking the video…"
      : progress.stage === "uploading"
        ? `Uploading video… ${progress.percent}%`
        : "Reading the video…";
  return (
    <li className="animate-rise">
      <div className="shimmer relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-accent/30">
        <span className="grid size-14 place-items-center rounded-full border border-line-strong bg-canvas/60 pl-0.5 text-accent">
          <PlayIcon size={22} className={progress.stage === "uploading" ? "" : "animate-blink"} />
        </span>
      </div>
      {total && total > 1 && (
        <p className="mt-3 text-[13px] font-medium tracking-wider text-muted uppercase tabular-nums">
          {current} of {total}
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className={`${total && total > 1 ? "mt-0.5" : "mt-3"} text-[17px] leading-snug font-semibold tracking-tight tabular-nums`}
      >
        {/* Announce stages, not every percent: screen readers get the bar's value instead. */}
        <span aria-hidden="true">{line}</span>
        <span className="sr-only">
          {progress.stage === "uploading" ? "Uploading video…" : line}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Video upload"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-line-strong"
      >
        <div
          className={`h-full rounded-full bg-accent transition-[width] duration-300 ease-out ${
            progress.stage === "reading" ? "animate-blink" : ""
          }`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
    </li>
  );
}

type ErrorProps = { message: string; onRetry: () => void; onDismiss: () => void };

export function SnapErrorCard({ message, onRetry, onDismiss }: ErrorProps) {
  return (
    <li className="animate-rise">
      <div className="relative flex aspect-video flex-col items-start justify-end gap-4 overflow-hidden rounded-xl border border-line bg-surface p-5">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute top-1 right-1 grid size-12 place-items-center rounded-full text-muted hover:text-fg"
        >
          <CloseIcon />
        </button>
        <AlertIcon size={26} className="text-accent" />
        <p role="status" aria-live="polite" className="max-w-[26ch] text-xl leading-snug font-semibold tracking-tight">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 flex h-12 items-center gap-2 rounded-xl border border-line-strong px-4 font-medium hover:bg-surface"
      >
        <CameraIcon />
        Try again
      </button>
    </li>
  );
}
