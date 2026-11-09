// Server-only: room names and room + time attribution (SPEC §6.2), shared by snap, room and feed.
import type { Talk } from "@/lib/types";
import { TALKS_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import schedule from "@/data/schedule.json";

const ROOM_NAMES: Record<string, string> = Object.fromEntries(
  schedule.rooms.map((r: { room: string; name: string }) => [r.room, r.name]),
);

export function roomName(room: string): string {
  return ROOM_NAMES[room] ?? room;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTalk(src: any): Talk {
  return {
    talk_id: src.talk_id ?? "",
    room: src.room ?? "",
    room_name: src.room_name ?? roomName(src.room ?? ""),
    title: src.title ?? "",
    speakers: src.speakers ?? "",
    abstract: src.abstract ?? "",
    start: src.start ?? "",
    end: src.end ?? "",
  };
}

/** The talk running in `room` at `takenAt` (ISO), or null. */
export async function talkAt(room: string, takenAt: string): Promise<Talk | null> {
  const res = await es().search({
    index: TALKS_INDEX,
    size: 1,
    sort: [{ start: "desc" }],
    query: {
      bool: {
        filter: [
          { term: { room } },
          { range: { start: { lte: takenAt } } },
          { range: { end: { gte: takenAt } } },
        ],
      },
    },
  });
  const hit = res.hits.hits[0];
  return hit ? toTalk(hit._source) : null;
}

/** A talk by id, or null if it doesn't exist. */
export async function talkById(talkId: string): Promise<Talk | null> {
  try {
    const res = await es().get({ index: TALKS_INDEX, id: talkId });
    return res.found ? toTalk(res._source) : null;
  } catch (err) {
    if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode === 404) return null;
    throw err;
  }
}
