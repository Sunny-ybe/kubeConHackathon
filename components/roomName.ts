// Server-only: the display name for any room, scheduled or hosted (SPEC §14).
import { cache } from "react";
import { ROOMS_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { rooms } from "./schedule";

/** "team-offsite-x7k2" -> "Team Offsite": a readable stand-in when the rooms index can't be read. */
function fromSlug(room: string): string {
  const words = room.split("-").filter(Boolean);
  if (words.length > 1 && /^[a-z0-9]{4}$/.test(words[words.length - 1])) words.pop();
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || room;
}

/** Scheduled rooms come from data/schedule.json; hosted rooms from backrow-rooms. Never throws.
 *  Cached per request, so metadata and the page share one lookup. */
export const displayRoomName = cache(async (room: string): Promise<string> => {
  const scheduled = rooms.find((r) => r.room === room);
  if (scheduled) return scheduled.name;
  try {
    const doc = await es().get<{ name?: string }>({ index: ROOMS_INDEX, id: room });
    if (doc._source?.name) return doc._source.name;
  } catch {
    /* not found or ES unavailable */
  }
  return fromSlug(room);
});
