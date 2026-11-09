import RoomView from "@/components/room/RoomView";
import { displayRoomName, roomMeta } from "@/components/roomName";
import { talkFor } from "@/components/schedule";
import type { Talk } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return { title: `${await displayRoomName(room)} · Backrow` };
}

export default async function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const { name, hosted } = await roomMeta(room);
  // Header shows the scheduled talk instantly; the API's answer replaces it once loaded.
  const now = talkFor(room);
  const fallbackTalk: Talk | null = now?.live ? { ...now.talk, room_name: name } : null;
  return <RoomView room={room} roomName={name} hosted={hosted} fallbackTalk={fallbackTalk} />;
}
