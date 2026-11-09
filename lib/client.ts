// Browser-side API client. Returns lib/fixtures.ts data when NEXT_PUBLIC_USE_FIXTURES=1.
import type {
  CreateRoomResponse,
  FeedResponse,
  ModerateResponse,
  PendingResponse,
  RoomResponse,
  Slide,
  SnapResponse,
  TranslateResponse,
} from "./types";
import { IMAGE_MAX_PX, MAX_UPLOAD_BYTES, THUMB_MAX_PX } from "./config";
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
