"use client";

import { useState } from "react";
import type { Slide } from "@/lib/types";

type Size = "lg" | "md" | "sm";

const TILE_TEXT: Record<Size, string> = {
  lg: "text-[44px] leading-[1.1] p-10 line-clamp-4",
  md: "text-[22px] leading-[1.15] p-4 line-clamp-3",
  sm: "text-[15px] leading-[1.15] p-2.5 line-clamp-3",
};

/**
 * 16:9 slide thumbnail. When there is no image, or it fails to load, it shows a
 * designed text tile with the slide title instead of a broken image.
 */
export function SlideThumb({ slide, size, className = "" }: { slide: Slide; size: Size; className?: string }) {
  const [failed, setFailed] = useState(!slide.thumb_url);
  const title = slide.title || slide.text.split("\n")[0] || "Untitled slide";

  return (
    <div className={`relative aspect-video overflow-hidden rounded-[10px] border border-white/8 bg-[#16161A] ${className}`}>
      {failed ? (
        <div className="flex h-full flex-col justify-end">
          <span aria-hidden className="absolute left-0 top-0 h-full w-[4px] bg-[#FFB020]/70" />
          <p className={`font-semibold tracking-[-0.01em] text-[#F4F4F5] ${TILE_TEXT[size]}`}>{title}</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.thumb_url}
          alt={title}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          // A server-rendered image can fail before hydration attaches onError.
          ref={(el) => {
            if (el?.complete && el.naturalWidth === 0) setFailed(true);
          }}
        />
      )}
    </div>
  );
}
