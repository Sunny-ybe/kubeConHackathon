"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IdCardIcon, UsersIcon } from "@/components/icons";

/** Header button for the opt-in people cards: "Who's here" (/people) and "Make your card" (/card). */
export default function PeopleMenu({ room }: { room: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const qs = `?room=${encodeURIComponent(room)}`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors hover:bg-raised";
  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="People"
        aria-expanded={open}
        aria-controls="people-menu"
        onClick={() => setOpen((o) => !o)}
        className={`grid size-12 place-items-center rounded-full transition-colors hover:text-fg ${open ? "text-fg" : "text-muted"}`}
      >
        <UsersIcon size={22} />
      </button>
      {open && (
        <div
          id="people-menu"
          className="animate-fade absolute top-full right-0 z-40 mt-1 w-56 rounded-2xl border border-line-strong bg-surface p-1.5 shadow-2xl shadow-black/60"
        >
          <Link href={`/people${qs}`} onClick={() => setOpen(false)} className={item}>
            <UsersIcon size={20} className="text-muted" />
            Who&apos;s here
          </Link>
          <Link href={`/card${qs}`} onClick={() => setOpen(false)} className={item}>
            <IdCardIcon size={20} className="text-muted" />
            Make your card
          </Link>
        </div>
      )}
    </div>
  );
}
