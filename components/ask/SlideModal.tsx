"use client";
// The cited-slide sheet: big title and text. Native <dialog> gives focus trap, Esc and backdrop.
import { useEffect, useRef } from "react";
import type { Slide } from "@/lib/types";
import { SlideThumb, slideMeta } from "./ui";

export default function SlideModal({ slide, label, onClose }: { slide: Slide | null; label?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (slide && !d.open) d.showModal();
    if (!slide && d.open) d.close();
  }, [slide]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="slide-modal-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-black/75"
    >
      {slide && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {label && <p className="mb-1 text-sm font-semibold text-accent">{label}</p>}
              <h2 id="slide-modal-title" className="text-2xl font-semibold leading-tight">
                {slide.title || "Untitled slide"}
              </h2>
              <p className="mt-1.5 text-sm text-muted">{slideMeta(slide)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 grid size-12 shrink-0 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <SlideThumb key={slide.slide_id} slide={slide} size="lg" />
          {slide.text && <p className="mt-5 whitespace-pre-line text-xl leading-relaxed">{slide.text}</p>}
          {slide.alt_text && (
            <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Diagram</p>
              <p className="text-lg leading-relaxed">{slide.alt_text}</p>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
