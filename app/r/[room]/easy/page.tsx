import EasyReadScreen from "@/components/easy/EasyReadScreen";
import { displayRoomName } from "@/components/roomName";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return { title: `Easy read · ${await displayRoomName(room)}` };
}

export default async function EasyPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return <EasyReadScreen room={room} roomName={await displayRoomName(room)} />;
}
