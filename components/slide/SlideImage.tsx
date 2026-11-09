"use client";
import { useState } from "react";
import type { Slide } from "@/lib/types";

type Props = { slide: Slide; size: "thumb" | "full"; large?: boolean };

/** The slide photo, or a designed text tile when there is no photo or it fails to load. */
export default function SlideImage({ slide, size, large }: Props) {
  const src = size === "thumb" ? slide.thumb_url : slide.image_url;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <TextTile slide={slide} large={large} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by /api/slides, sizes vary
    <img
      src={src}
      alt={slide.title || "Slide photo"}
      loading={size === "thumb" ? "lazy" : "eager"}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

export function TextTile({ slide, large }: { slide: Slide; large?: boolean }) {
  const eyebrow = slide.topics[0] ?? "Slide";
  return (
    <div role="img" aria-label={slide.title || "Untitled slide"} className="absolute inset-0 overflow-hidden bg-surface">
      <div className="tile-grid absolute inset-0 [mask-image:radial-gradient(120%_90%_at_100%_0%,black,transparent_75%)]" />
      <div className="absolute top-0 left-0 h-full w-[3px] bg-accent/70" />
      <div className={`relative flex h-full flex-col justify-between ${large ? "p-6 sm:p-8" : "p-4"}`}>
        <span className="font-mono text-[11px] tracking-wider text-muted uppercase">{eyebrow}</span>
        <p
          className={`line-clamp-3 font-semibold tracking-tight text-balance text-fg ${
            large ? "text-[26px] leading-[1.15] sm:text-4xl" : "text-xl leading-[1.2]"
          }`}
        >
          {slide.title || "Untitled slide"}
        </p>
      </div>
    </div>
  );
}
