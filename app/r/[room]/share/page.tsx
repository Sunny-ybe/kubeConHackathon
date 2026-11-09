import ShareScreen from "@/components/rooms/ShareScreen";
import { displayRoomName } from "@/components/roomName";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return { title: `Join ${await displayRoomName(room)} · Backrow` };
}

export default async function SharePage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return <ShareScreen room={room} roomName={await displayRoomName(room)} />;
}
