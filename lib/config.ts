// Client-safe constants. FROZEN: change only through the human.

export const TALKS_INDEX = "backrow-talks";
export const SLIDES_INDEX = "backrow-slides";

export const FEED_POLL_MS = 4000;
export const LIVE_POLL_MS = 2000;
export const HEAT_WINDOW_MIN = 10;

export const DEDUPE_WINDOW_MIN = 10;
export const DEDUPE_JACCARD = 0.5;

export const MAX_UPLOAD_BYTES = 2_000_000;
export const IMAGE_MAX_PX = 1280;
export const THUMB_MAX_PX = 400;

export const DEMO_ROOM = "demo";

export const LANGS = [
  { code: "es", label: "Español", speech: "es-ES" },
  { code: "hi", label: "हिन्दी", speech: "hi-IN" },
  { code: "zh", label: "中文", speech: "zh-CN" },
  { code: "fr", label: "Français", speech: "fr-FR" },
  { code: "pt", label: "Português", speech: "pt-BR" },
  { code: "ja", label: "日本語", speech: "ja-JP" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

export function imageUrl(slideId: string, size: "thumb" | "full" = "full"): string {
  return `/api/slides/${encodeURIComponent(slideId)}/image${size === "thumb" ? "?size=thumb" : ""}`;
}

/** The event runs on Mountain Time. Servers (Vercel) run on UTC, so always format with this. */
export const EVENT_TZ = "America/Denver";

/** "2:41 PM" in Denver time. Use this for every time shown in the UI; never toLocaleTimeString() bare. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { timeZone: EVENT_TZ, hour: "numeric", minute: "2-digit" });
}
