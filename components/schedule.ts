// Rooms and talks from data/schedule.json, for server components (landing, room header fallback, QR).
import schedule from "@/data/schedule.json";
import type { RoomInfo } from "@/lib/types";

type ScheduleTalk = (typeof schedule.talks)[number];

export const rooms: RoomInfo[] = schedule.rooms;

export function roomName(room: string): string {
  return rooms.find((r) => r.room === room)?.name ?? room;
}

/** The talk on now in a room, else the next one today, else null. */
export function talkFor(room: string, now = Date.now()): { talk: ScheduleTalk; live: boolean } | null {
  const talks = schedule.talks
    .filter((t) => t.room === room)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const live = talks.find((t) => Date.parse(t.start) <= now && now <= Date.parse(t.end));
  if (live) return { talk: live, live: true };
  const next = talks.find((t) => Date.parse(t.start) > now);
  return next ? { talk: next, live: false } : null;
}
