"use client";
// STUB. Agent C replaces the body. Keep the default export and these props unchanged,
// because the room page (Agent B) renders <AskPanel room={...} talkId={...} />.

export type AskPanelProps = { room: string; talkId?: string };

export default function AskPanel({ room }: AskPanelProps) {
  return (
    <div className="rounded-xl bg-[#16161A] p-4 text-sm text-[#A1A1AA]">
      Ask is on its way for room {room}.
    </div>
  );
}
