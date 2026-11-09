"use client";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import { useFeed } from "@/components/hooks/useFeed";
import EasyReader from "./EasyReader";

/** Full-screen easy read: pure black, very large text, nothing else on screen. */
export default function EasyReadScreen({ room, roomName }: { room: string; roomName: string }) {
  const { data, failed } = useFeed(room);
  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pt-2 pb-safe sm:px-10">
        <div className="flex h-14 items-center gap-1">
          <Link
            href={`/r/${encodeURIComponent(room)}`}
            aria-label={`Back to ${roomName}`}
            className="-ml-3 grid size-12 place-items-center rounded-full text-white/70 hover:text-white"
          >
            <ChevronLeftIcon size={26} />
          </Link>
          <h1 className="truncate text-[15px] font-medium tracking-wide text-white/60 uppercase">{roomName}</h1>
        </div>
        {failed && !data && (
          <p role="status" className="text-lg text-white/60">
            Can&apos;t reach the room right now. Trying again…
          </p>
        )}
        <div className="flex flex-1 flex-col pt-4 pb-2">
          <EasyReader slides={data?.slides ?? null} />
        </div>
      </div>
    </div>
  );
}
