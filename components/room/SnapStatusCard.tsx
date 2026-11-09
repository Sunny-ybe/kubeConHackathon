"use client";
import { useEffect, useState } from "react";
import { AlertIcon, CameraIcon, CloseIcon } from "@/components/icons";

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
