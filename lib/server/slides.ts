// Server-only helpers shared by every API route. FROZEN.
import { createHash } from "node:crypto";
import type { Slide } from "../types";
import { imageUrl } from "../config";

/** Never return these in search results: they are the base64 images. */
export const HEAVY_FIELDS = ["image", "thumb"];

/** Map an Elasticsearch slide _source to the API Slide shape. device_id never leaves the server. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSlide(id: string, src: any, opts: { snaps?: number; deviceId?: string } = {}): Slide {
  return {
    slide_id: id,
    shared: !!src.shared,
    is_slide: !!src.is_slide,
    room: src.room ?? "",
    talk_id: src.talk_id ?? "",
    talk_title: src.talk_title ?? "",
    taken_at: src.taken_at ?? "",
    title: src.title ?? "",
    text: src.text ?? "",
    alt_text: src.alt_text ?? "",
    topics: src.topics ?? [],
    cluster_id: src.cluster_id ?? id,
    snaps: opts.snaps,
    mine: opts.deviceId ? src.device_id === opts.deviceId : undefined,
    thumb_url: imageUrl(id, "thumb"),
    image_url: imageUrl(id, "full"),
    status: src.status === "pending" ? "pending" : src.status === "approved" ? "approved" : undefined,
    kind: src.kind === "photo" ? "photo" : src.kind === "slide" ? "slide" : undefined,
  };
}

/**
 * Visible-to-others rule (SPEC §14): shared, accepted, and not waiting for the host.
 * Use inside a bool `filter`/`should` wherever other people's slides are shown.
 */
export const PUBLIC_SLIDE = {
  bool: {
    filter: [{ term: { shared: true } }, { term: { is_slide: true } }],
    must_not: [{ term: { status: "pending" } }],
  },
};

/** Normalized word tokens (3+ chars) used for duplicate detection. */
export function words(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9][a-z0-9.\-]{2,}/g) ?? [];
}

/** Word-set overlap between two slide texts, 0..1. */
export function jaccard(a: string, b: string): number {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Deterministic cluster id from the slide's most distinctive words, so two people
 * snapping the same clean slide in the same second land in the same cluster.
 * Returns null when there is no text (caller falls back to slide_id).
 */
export function fingerprint(talkId: string, text: string): string | null {
  const uniq = [...new Set(words(text))];
  if (!uniq.length) return null;
  const top = uniq
    .sort((x, y) => y.length - x.length || x.localeCompare(y))
    .slice(0, 12)
    .sort()
    .join(" ");
  return "c_" + createHash("sha1").update(`${talkId}|${top}`).digest("hex").slice(0, 16);
}
