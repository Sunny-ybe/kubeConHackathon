// Browser-side API client. Returns lib/fixtures.ts data when NEXT_PUBLIC_USE_FIXTURES=1.
import { upload } from "@vercel/blob/client";
import type {
  CreateRoomResponse,
  FeedResponse,
  MediaResponse,
  ModerateResponse,
  PendingResponse,
  RoomResponse,
  Slide,
  SnapResponse,
  TranslateResponse,
  VideoUploadPayload,
} from "./types";
import { IMAGE_MAX_PX, MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, THUMB_MAX_PX, VIDEO_TYPES } from "./config";
import { deviceId, getSharePref } from "./device";
import { feedFixture, roomFixture, slidesFixture, snapFixture, translateFixture } from "./fixtures";

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

export const isVideoFile = (file: File) => file.type.startsWith("video/");

const VIDEO_LIMITS = `Videos can be up to ${MAX_VIDEO_SECONDS} seconds and ${Math.round(MAX_VIDEO_BYTES / 1_000_000)} MB.`;
const UNREADABLE = "Couldn't read that video. Try one recorded with your phone's camera.";

function once(el: HTMLVideoElement, event: string, ms = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => done(new Error(`timeout: ${event}`)), ms);
    const ok = () => done();
    const fail = () => done(new Error("video error"));
    function done(err?: Error) {
      clearTimeout(t);
      el.removeEventListener(event, ok);
      el.removeEventListener("error", fail);
      if (err) reject(err);
      else resolve();
    }
    el.addEventListener(event, ok);
    el.addEventListener("error", fail);
  });
}

function canvasJpeg(video: HTMLVideoElement, maxPx: number, quality: number): Promise<Blob> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const scale = Math.min(1, maxPx / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode poster"))), "image/jpeg", quality),
  );
}

/**
 * Read a video's length and grab a poster frame at ~1s (1280px JPEG + 400px thumb).
 * iOS only decodes frames for a muted, inline video once data has loaded.
 */
async function readVideo(file: File): Promise<{ duration: number; image: Blob; thumb: Blob }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    if (video.readyState < 1) await once(video, "loadedmetadata");
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("no duration");
    // Too long: report the length without decoding anything.
    if (duration > MAX_VIDEO_SECONDS + 0.5) return { duration, image: new Blob(), thumb: new Blob() };
    if (video.readyState < 2) {
      const loaded = once(video, "loadeddata");
      // iOS Safari won't buffer frames until playback starts; a muted inline play is allowed.
      video.play().then(() => video.pause(), () => {});
      await loaded;
    }
    const at = Math.min(1, duration / 2);
    if (Math.abs(video.currentTime - at) > 0.05) {
      const seeked = once(video, "seeked");
      video.currentTime = at;
      await seeked;
    }
    if (!video.videoWidth) throw new Error("no frame");
    let image = await canvasJpeg(video, IMAGE_MAX_PX, 0.8);
    if (image.size > MAX_UPLOAD_BYTES) image = await canvasJpeg(video, IMAGE_MAX_PX, 0.6);
    const thumb = await canvasJpeg(video, THUMB_MAX_PX, 0.75);
    return { duration, image, thumb };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function blobName(file: File): string {
  const ext = file.type === "video/quicktime" ? "mov" : file.type === "video/webm" ? "webm" : "mp4";
  const base = file.name.replace(/\.[^.]*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base.slice(0, 40) || "video"}.${ext}`;
}

export type VideoProgress = { stage: "checking" } | { stage: "uploading"; percent: number } | { stage: "reading" };

/**
 * Video snap (hosted rooms, SPEC §15): check limits, grab the poster frame, upload the file
 * straight to Vercel Blob, then post the poster to /api/snap with video_url and duration_s.
 */
export async function snapVideo(
  file: File,
  room: string,
  onProgress: (p: VideoProgress) => void,
): Promise<SnapResponse> {
  onProgress({ stage: "checking" });
  if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "error", message: "That video format isn't supported. Try an MP4 or MOV." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = Math.round(file.size / 1_000_000);
    return { ok: false, reason: "too_large", message: `That video is ${mb} MB. ${VIDEO_LIMITS}` };
  }
  let frame: { duration: number; image: Blob; thumb: Blob };
  try {
    frame = await readVideo(file);
  } catch {
    return { ok: false, reason: "error", message: UNREADABLE };
  }
  if (frame.duration > MAX_VIDEO_SECONDS + 0.5) {
    const t = Math.round(frame.duration);
    const len = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    return { ok: false, reason: "too_large", message: `That video is ${len} long. ${VIDEO_LIMITS}` };
  }
  if (USE_FIXTURES) {
    for (let p = 0; p <= 100; p += 10) {
      onProgress({ stage: "uploading", percent: p });
      await wait(250);
    }
    onProgress({ stage: "reading" });
    await wait(1500);
    return snapFixture;
  }
  try {
    const payload: VideoUploadPayload = { room, device_id: deviceId() };
    onProgress({ stage: "uploading", percent: 0 });
    const blob = await upload(`videos/${room}/${blobName(file)}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify(payload),
      contentType: file.type,
      multipart: true,
      onUploadProgress: (e) => onProgress({ stage: "uploading", percent: Math.round(e.percentage) }),
    });
    onProgress({ stage: "reading" });
    const form = new FormData();
    form.append("image", frame.image, "poster.jpg");
    form.append("thumb", frame.thumb, "thumb.jpg");
    form.append("room", room);
    form.append("device_id", deviceId());
    form.append("shared", "true");
    form.append("video_url", blob.url);
    form.append("duration_s", String(Math.round(frame.duration * 10) / 10));
    const res = await fetch("/api/snap", { method: "POST", body: form });
    return (await res.json()) as SnapResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return {
      ok: false,
      reason: "error",
      message: /not set up|only be shared/i.test(msg) ? msg : "Couldn't upload that video. Check your connection and try again.",
    };
  }
}

/** Room header info. Passes device_id so a hosted room can say whether this device is the host. */
export async function getRoom(room: string): Promise<RoomResponse> {
  if (USE_FIXTURES) return roomFx(room);
  const qs = new URLSearchParams({ device_id: deviceId() });
  return getJSON(`/api/room/${encodeURIComponent(room)}?${qs}`);
}

/** Start a hosted room (SPEC §14). A blank name gets a random one server-side. */
export async function createRoom(name: string): Promise<CreateRoomResponse> {
  if (USE_FIXTURES) {
    await wait(600);
    return createRoomFx(name);
  }
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() || undefined, device_id: deviceId() }),
  });
  if (!res.ok) throw new Error(`Could not start the room (${res.status})`);
  return res.json() as Promise<CreateRoomResponse>;
}

/** Guest uploads waiting for the host, newest first. Host only (403 otherwise). */
export async function getPending(room: string): Promise<PendingResponse> {
  if (USE_FIXTURES) return { room, slides: pendingFx.filter((s) => !moderatedFx.has(s.slide_id)) };
  const qs = new URLSearchParams({ device_id: deviceId() });
  return getJSON(`/api/rooms/${encodeURIComponent(room)}/pending?${qs}`);
}

export async function moderate(room: string, slideId: string, action: "approve" | "reject"): Promise<ModerateResponse> {
  if (USE_FIXTURES) {
    await wait(400);
    moderatedFx.add(slideId);
    return { ok: true, slide_id: slideId, status: action === "approve" ? "approved" : "deleted" };
  }
  const res = await fetch(`/api/rooms/${encodeURIComponent(room)}/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId(), slide_id: slideId, action }),
  });
  if (!res.ok) throw new Error(`Moderation failed (${res.status})`);
  return res.json() as Promise<ModerateResponse>;
}

export async function getFeed(room: string): Promise<FeedResponse> {
  if (USE_FIXTURES) return { ...feedFixture, room };
  const qs = new URLSearchParams({ room, device_id: deviceId() });
  return getJSON(`/api/feed?${qs}`);
}

/**
 * Everything downloadable in a room (SPEC §15): "mine" = this device's uploads, "all" = what
 * everyone can see plus mine. Newest first, up to MAX_DOWNLOAD_ITEMS.
 */
export async function getMedia(room: string, scope: "mine" | "all"): Promise<MediaResponse> {
  if (USE_FIXTURES) {
    await wait(500);
    const items = slidesFixture.map((s, i) => ({ ...s, mine: i % 2 === 0 }));
    return { room, scope, items: scope === "mine" ? items.filter((s) => s.mine) : items };
  }
  const qs = new URLSearchParams({ device_id: deviceId(), scope });
  return getJSON(`/api/rooms/${encodeURIComponent(room)}/media?${qs}`);
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

// Fixture mode for hosted rooms: rooms this browser "started" are remembered in localStorage,
// so /new -> /r/<room>/share -> /r/<room> behaves like the real API (this device is the host).
const FX_ROOMS_KEY = "backrow_fx_rooms";

function fxRooms(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FX_ROOMS_KEY) || "{}");
  } catch {
    return {};
  }
}

function createRoomFx(name: string): CreateRoomResponse {
  const room_name = name.trim() || "Amber Falcon";
  const slug = room_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room";
  const room = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    localStorage.setItem(FX_ROOMS_KEY, JSON.stringify({ ...fxRooms(), [room]: room_name }));
  } catch {
    /* ignore */
  }
  return { room, room_name };
}

function roomFx(room: string): RoomResponse {
  const name = fxRooms()[room];
  if (!name) return { ...roomFixture, room };
  const pending_count = pendingFx.filter((s) => !moderatedFx.has(s.slide_id)).length;
  return { room, room_name: name, talk: null, hosted: true, host: true, pending_count };
}

const moderatedFx = new Set<string>();
const pendingFx: Slide[] = slidesFixture.slice(1).map((s, i) => ({
  ...s,
  slide_id: `fx-pending-${i}`,
  cluster_id: `fx-pending-${i}`,
  status: "pending",
  kind: i === 0 ? "photo" : "slide",
  title: i === 0 ? "Team photo by the booth" : s.title,
  text: i === 0 ? "" : s.text,
  alt_text: i === 0 ? "A group of people standing in front of a conference booth with a large orange banner." : s.alt_text,
  mine: false,
}));
