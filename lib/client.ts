// Browser-side API client. Returns lib/fixtures.ts data when NEXT_PUBLIC_USE_FIXTURES=1.
import type { FeedResponse, RoomResponse, SnapResponse, TranslateResponse } from "./types";
import { IMAGE_MAX_PX, MAX_UPLOAD_BYTES, THUMB_MAX_PX } from "./config";
import { deviceId, getSharePref } from "./device";
import { feedFixture, roomFixture, snapFixture, translateFixture } from "./fixtures";

const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES === "1";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Scale an image so its longest side is at most maxPx, and encode it as JPEG. */
export async function resizeImage(file: Blob, maxPx: number, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality),
  );
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

/** Resize the photo, then post it to /api/snap with this device's id and share choice. */
export async function snap(file: File, room: string): Promise<SnapResponse> {
  if (USE_FIXTURES) {
    await wait(4200);
    return snapFixture;
  }
  try {
    let image = await resizeImage(file, IMAGE_MAX_PX);
    if (image.size > MAX_UPLOAD_BYTES) image = await resizeImage(file, IMAGE_MAX_PX, 0.6);
    const thumb = await resizeImage(file, THUMB_MAX_PX, 0.75);
    const form = new FormData();
    form.append("image", image, "slide.jpg");
    form.append("thumb", thumb, "thumb.jpg");
    form.append("room", room);
    form.append("device_id", deviceId());
    form.append("shared", getSharePref() === "private" ? "false" : "true");
    const res = await fetch("/api/snap", { method: "POST", body: form });
    if (res.status === 413) return { ok: false, reason: "too_large", message: "That photo is too large." };
    const body = (await res.json()) as SnapResponse;
    return body;
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function getRoom(room: string): Promise<RoomResponse> {
  if (USE_FIXTURES) return { ...roomFixture, room };
  return getJSON(`/api/room/${encodeURIComponent(room)}`);
}

export async function getFeed(room: string): Promise<FeedResponse> {
  if (USE_FIXTURES) return { ...feedFixture, room };
  const qs = new URLSearchParams({ room, device_id: deviceId() });
  return getJSON(`/api/feed?${qs}`);
}

export async function translate(text: string, lang: string): Promise<TranslateResponse> {
  if (USE_FIXTURES) {
    await wait(700);
    return translateFixture(text, lang);
  }
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  });
  if (!res.ok) throw new Error(`Translate failed (${res.status})`);
  return res.json() as Promise<TranslateResponse>;
}
