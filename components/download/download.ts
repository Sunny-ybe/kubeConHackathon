// Download flow helpers (SPEC §15): fetch each item's bytes, then zip them or hand them to the share sheet.
import { MAX_DOWNLOAD_ITEMS } from "@/lib/config";
import type { Slide } from "@/lib/types";
import { ZipWriter } from "@/lib/zip";

/** The share sheet ("Save to Photos") is offered for this many items or fewer. */
export const SHARE_MAX_ITEMS = 10;

const isVideo = (s: Slide) => s.media === "video" && !!s.video_url;

function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "photo"
  );
}

function videoExt(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ext === "mov" || ext === "webm" || ext === "mp4" ? ext : "mp4";
}

/** "<room>-<NN>-<title-slug>.jpg|mp4", numbered in list order. */
export function fileName(s: Slide, index: number, total: number): string {
  const nn = String(index + 1).padStart(Math.max(2, String(total).length), "0");
  const ext = isVideo(s) ? videoExt(s.video_url!) : "jpg";
  return `${s.room || "backrow"}-${nn}-${slugify(s.title)}.${ext}`;
}

/** "12 photos", "3 photos · 1 video", "1 video". */
export function countLabel(items: Slide[]): string {
  const videos = items.filter(isVideo).length;
  const photos = items.length - videos;
  const parts = [
    photos || !videos ? `${photos} ${photos === 1 ? "photo" : "photos"}` : "",
    videos ? `${videos} ${videos === 1 ? "video" : "videos"}` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

export type Fetched = { file: File; slide: Slide };

/**
 * Fetch every item's bytes (images from /api/slides/…/image, videos from Blob), a few at a
 * time, keeping list order. Failed items are skipped and counted.
 */
export async function fetchAll(
  items: Slide[],
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<{ files: Fetched[]; failed: number }> {
  const list = items.slice(0, MAX_DOWNLOAD_ITEMS);
  const results: (Fetched | null)[] = new Array(list.length).fill(null);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      const s = list[i];
      try {
        const res = await fetch(isVideo(s) ? s.video_url! : s.image_url, { signal });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const type = blob.type || (isVideo(s) ? "video/mp4" : "image/jpeg");
        results[i] = { slide: s, file: new File([blob], fileName(s, i, list.length), { type }) };
      } catch (e) {
        if (signal.aborted) throw e;
      }
      onProgress(++done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, list.length) }, worker));
  const files = results.filter((r): r is Fetched => r !== null);
  return { files, failed: list.length - files.length };
}

/** True when this browser can put these files in the share sheet (iOS / Android "Save to Photos"). */
export function canShareFiles(files?: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  const probe = files ?? [new File([new Uint8Array(1)], "probe.jpg", { type: "image/jpeg" })];
  try {
    return navigator.canShare({ files: probe });
  } catch {
    return false;
  }
}

export async function zipAndSave(files: Fetched[], zipName: string): Promise<void> {
  const zip = new ZipWriter();
  for (const f of files) {
    const taken = new Date(f.slide.taken_at);
    zip.add(f.file.name, new Uint8Array(await f.file.arrayBuffer()), Number.isNaN(taken.getTime()) ? new Date() : taken);
  }
  const url = URL.createObjectURL(zip.finish());
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start reading the blob before it is released.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
