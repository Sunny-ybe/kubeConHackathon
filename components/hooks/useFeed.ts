"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEED_POLL_MS } from "@/lib/config";
import { getFeed } from "@/lib/client";
import type { FeedResponse } from "@/lib/types";

/** Polls the room feed every FEED_POLL_MS and describes newly arrived slides for screen readers. */
export function useFeed(room: string) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const known = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getFeed(room);
      const ids = new Set(next.slides.map((s) => s.cluster_id));
      if (known.current) {
        const fresh = [...ids].filter((id) => !known.current!.has(id)).length;
        if (fresh > 0) setAnnouncement(fresh === 1 ? "1 new slide in the feed" : `${fresh} new slides in the feed`);
      }
      known.current = ids;
      setData(next);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [room]);

  useEffect(() => {
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
  }, [refresh]);

  return { data, failed, announcement, refresh };
}
