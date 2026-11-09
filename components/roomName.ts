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
export const roomMeta = cache(async (room: string): Promise<{ name: string; hosted: boolean }> => {
  const scheduled = rooms.find((r) => r.room === room);
  if (scheduled) return { name: scheduled.name, hosted: false };
  try {
    const doc = await es().get<{ name?: string }>({ index: ROOMS_INDEX, id: room });
    if (doc.found) return { name: doc._source?.name || fromSlug(room), hosted: true };
  } catch {
    /* not found or ES unavailable */
  }
  return { name: fromSlug(room), hosted: false };
});

export async function displayRoomName(room: string): Promise<string> {
  return (await roomMeta(room)).name;
}
