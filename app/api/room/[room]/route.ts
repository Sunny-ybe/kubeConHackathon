import type { RoomResponse } from "@/lib/types";
import { roomName, talkAt } from "../attribution";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  try {
    const talk = await talkAt(room, new Date().toISOString());
    const body: RoomResponse = { room, room_name: roomName(room), talk };
    return Response.json(body);
  } catch (err) {
    console.error("room lookup failed", err);
    return Response.json({ error: "Could not load this room" }, { status: 500 });
  }
}
