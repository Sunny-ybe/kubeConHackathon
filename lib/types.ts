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
};

export type Citation = { label: string; slide: Slide }; // label like "S3"

export type SnapResponse =
  | { ok: true; slide: Slide; talk: Talk | null; cluster_size: number }
  | { ok: false; reason: "not_a_slide" | "too_large" | "error"; message: string };

export type RoomResponse = { room: string; room_name: string; talk: Talk | null };

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
