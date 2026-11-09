"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEED_POLL_MS } from "@/lib/config";
import { getPending, moderate } from "@/lib/client";
import type { Slide } from "@/lib/types";

type Action = "approve" | "reject";

/**
 * Host only: polls the room's pending uploads every FEED_POLL_MS. Approve / Reject are optimistic:
 * the card leaves at once, polls can't bring it back, and it returns only if the request fails.
 * onApproved(slide, true) fires at the tap so the host's feed can show it at once; (slide, false) undoes it.
 */
export function usePending(room: string, enabled: boolean, onApproved: (slide: Slide, ok: boolean) => void) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const handled = useRef(new Set<string>());
  const known = useRef<Set<string> | null>(null);
  const onApprovedRef = useRef(onApproved);
  useEffect(() => {
    onApprovedRef.current = onApproved;
  }, [onApproved]);

  const refresh = useCallback(async () => {
    try {
      const res = await getPending(room);
      const next = res.slides.filter((s) => !handled.current.has(s.slide_id));
      if (known.current) {
        const fresh = next.filter((s) => !known.current!.has(s.slide_id)).length;
        if (fresh > 0) setAnnouncement(fresh === 1 ? "1 new photo waiting for approval" : `${fresh} new photos waiting for approval`);
      }
      known.current = new Set(next.map((s) => s.slide_id));
      setSlides(next);
    } catch {
      /* keep the last list; the next poll retries */
    }
  }, [room]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) await refresh();
      if (alive) timer = setTimeout(tick, FEED_POLL_MS);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled, refresh]);

  const act = useCallback(
    async (slide: Slide, action: Action) => {
      const id = slide.slide_id;
      const title = slide.title || "Photo";
      handled.current.add(id);
      setError("");
      setSlides((prev) => prev?.filter((s) => s.slide_id !== id) ?? prev);
      if (action === "approve") onApprovedRef.current(slide, true);
      try {
        const res = await moderate(room, id, action);
        if (!res.ok) throw new Error("not ok");
        setAnnouncement(action === "approve" ? `Approved “${title}”. Everyone can see it now.` : `Rejected “${title}”.`);
      } catch {
        handled.current.delete(id);
        if (action === "approve") onApprovedRef.current(slide, false);
        setSlides((prev) =>
          prev && !prev.some((s) => s.slide_id === id)
            ? [...prev, slide].sort((a, b) => b.taken_at.localeCompare(a.taken_at))
            : prev,
        );
        setError(`Couldn't ${action} “${title}”. Try again.`);
      }
    },
    [room],
  );

  return { slides, announcement, error, act };
}
