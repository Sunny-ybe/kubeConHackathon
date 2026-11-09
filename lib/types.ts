// Shared contract. FROZEN: change only through the human (see SPEC.md §11).

export type RoomInfo = { room: string; name: string };

export type Talk = {
  talk_id: string;
  room: string;
  room_name: string;
  title: string;
  speakers: string;
  abstract: string;
  start: string; // ISO with offset, e.g. 2026-11-09T14:00:00-07:00
  end: string;
};

export type Slide = {
  slide_id: string;
  shared: boolean;
  is_slide: boolean;
  room: string;
  talk_id: string;
  talk_title: string;
  taken_at: string; // ISO
  title: string;
  text: string;
  alt_text: string;
  topics: string[];
  cluster_id: string;
  snaps?: number; // how many snaps share this cluster (set by feed / live)
  mine?: boolean; // true if this device took it (set when device_id is passed)
  thumb_url: string; // /api/slides/{id}/image?size=thumb
  image_url: string; // /api/slides/{id}/image
  status?: SlideStatus; // hosted rooms only; missing means approved
  kind?: "slide" | "photo"; // "photo" = not a slide, accepted in a hosted room
  media?: "image" | "video"; // missing means image (SPEC §15)
  video_url?: string; // public Vercel Blob URL; image_url/thumb_url are its poster frame
  duration_s?: number; // video length in seconds
};

/** Hosted rooms (SPEC §14): the host's photos are approved at once, everyone else's wait as "pending". */
export type SlideStatus = "approved" | "pending";

export type Citation = { label: string; slide: Slide }; // label like "S3"

export type SnapResponse =
  | { ok: true; slide: Slide; talk: Talk | null; cluster_size: number; pending?: boolean }
  | { ok: false; reason: "not_a_slide" | "too_large" | "error"; message: string };

export type RoomResponse = {
  room: string;
  room_name: string;
  talk: Talk | null;
  hosted?: boolean; // started with "Start a room": any photo allowed, host approves uploads
  host?: boolean; // this device started the room (needs ?device_id=)
  pending_count?: number; // only set for the host
};

// Hosted rooms (SPEC §14)
export type CreateRoomRequest = { name?: string; device_id: string };
export type CreateRoomResponse = { room: string; room_name: string };
export type PendingResponse = { room: string; slides: Slide[] }; // newest first, host only
export type ModerateRequest = { device_id: string; slide_id: string; action: "approve" | "reject" };
export type ModerateResponse = { ok: boolean; slide_id: string; status: SlideStatus | "deleted" };

// Media + downloads (SPEC §15)
/** clientPayload sent with @vercel/blob/client upload() to /api/upload (JSON-encoded). */
export type VideoUploadPayload = { room: string; device_id: string };
/** GET /api/rooms/[room]/media?device_id=&scope=mine|all — everything downloadable, newest first. */
export type MediaResponse = { room: string; scope: "mine" | "all"; items: Slide[] };

export type FeedResponse = { room: string; talk: Talk | null; slides: Slide[] };

export type SearchHit = { slide: Slide; highlights: string[] };
export type SearchResponse = { query: string; hits: SearchHit[] };

export type AskResponse = { answer: string; citations: Citation[] };

export type ReportResponse = { markdown: string; citations: Citation[] };

export type MeResponse = { slides: Slide[] }; // this device's slides, newest first

export type TranslateResponse = { text: string };

export type LiveRoom = {
  room: string;
  room_name: string;
  talk_title: string;
  snaps: number;
  top_slide: Slide | null;
};

export type LiveResponse = {
  total_snaps: number;
  top_slides: { cluster_id: string; count: number; slide: Slide }[];
  rooms: LiveRoom[];
  latest: Slide[];
};
