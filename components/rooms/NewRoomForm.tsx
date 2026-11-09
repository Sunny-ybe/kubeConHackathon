"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRightIcon, BackrowMark, ChevronLeftIcon } from "@/components/icons";
import { createRoom } from "@/lib/client";

const STEPS = [
  ["Share the QR", "Hold it up or put it on screen."],
  ["Guests add photos", "Snap or upload from their phones."],
  ["You approve", "Only what you approve reaches everyone."],
] as const;

/** /new: optional room name, then straight to the share screen. */
export default function NewRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "starting" | "error">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "starting") return;
    setStatus("starting");
    try {
      const { room } = await createRoom(name);
      router.push(`/r/${encodeURIComponent(room)}/share`);
    } catch {
      setStatus("error");
    }
  }

  const starting = status === "starting";

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex h-16 items-center">
        <Link
          href="/"
          aria-label="Back to Backrow home"
          className="-ml-3 flex min-h-12 items-center gap-1.5 rounded-lg pr-2 pl-1.5 font-semibold tracking-tight"
        >
          <ChevronLeftIcon size={22} className="text-muted" />
          <BackrowMark />
          <span className="ml-1 text-[17px]">Backrow</span>
        </Link>
      </header>

      <main className="w-full max-w-xl flex-1 pt-10 pb-16 sm:pt-20 lg:mx-auto">
        <form onSubmit={onSubmit} className="animate-rise">
          <p className="text-[13px] font-medium tracking-wider text-muted uppercase">New room</p>
          <h1 className="mt-2 text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl">
            <label htmlFor="room-name">Name your room</label>
          </h1>
          <p id="room-name-hint" className="mt-3 text-lg text-muted">
            Optional. Leave it blank and we&apos;ll pick one.
          </p>

          <input
            id="room-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="go"
            placeholder="Team offsite"
            aria-describedby="room-name-hint"
            disabled={starting}
            className="mt-8 h-16 w-full rounded-2xl border border-line-strong bg-surface px-5 text-[22px] font-medium tracking-tight placeholder:text-muted/60 focus-visible:border-accent/60 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={starting}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent text-[17px] font-semibold text-on-accent transition-[transform,opacity] active:scale-[0.98] disabled:opacity-70"
          >
            {starting ? "Starting your room…" : "Start room"}
            {!starting && <ArrowRightIcon size={20} />}
          </button>

          <p aria-live="polite" className="mt-3 min-h-6 text-[15px] text-accent">
            {status === "error" ? "Couldn't start the room. Check your connection and try again." : ""}
          </p>
        </form>

        <ol aria-label="How a room works" className="mt-10 border-t border-line">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4 border-b border-line py-4">
              <span className="pt-0.5 font-mono text-xs text-muted tabular-nums">0{i + 1}</span>
              <div>
                <p className="font-semibold tracking-tight">{title}</p>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
