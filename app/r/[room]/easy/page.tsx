import EasyReadScreen from "@/components/easy/EasyReadScreen";
import { roomName } from "@/components/schedule";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return { title: `Easy read · ${roomName(room)}` };
}

export default async function EasyPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return <EasyReadScreen room={room} roomName={roomName(room)} />;
}
