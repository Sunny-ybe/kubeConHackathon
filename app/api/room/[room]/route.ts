import type { RoomResponse } from "@/lib/types";
import { SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { roomName, talkAt } from "../attribution";
import { hostedRoom, isHost } from "../hosted";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const deviceId = new URL(req.url).searchParams.get("device_id")?.trim() ?? "";
  try {
    const [talk, hosted] = await Promise.all([talkAt(room, new Date().toISOString()), hostedRoom(room)]);
    if (!hosted) {
      const body: RoomResponse = { room, room_name: roomName(room), talk, hosted: false, host: false };
      return Response.json(body);
    }
    const host = isHost(hosted, deviceId);
    const body: RoomResponse = { room, room_name: hosted.name, talk, hosted: true, host };
    if (host) {
      const { count } = await es().count({
        index: SLIDES_INDEX,
        query: { bool: { filter: [{ term: { room } }, { term: { status: "pending" } }] } },
      });
      body.pending_count = count;
    }
    return Response.json(body);
  } catch (err) {
    console.error("room lookup failed", err);
    return Response.json({ error: "Could not load this room" }, { status: 500 });
  }
}
