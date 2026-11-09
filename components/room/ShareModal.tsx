"use client";
import { useRef } from "react";
import type { SharePref } from "@/lib/device";
import { LockIcon, UsersIcon } from "@/components/icons";
import { useDialog } from "@/components/hooks/useDialog";

type Props = { onChoose: (pref: SharePref) => void; onCancel: () => void };

/** First snap only: "Share your snaps with the room?" */
export default function ShareModal({ onChoose, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="animate-fade absolute inset-0 bg-black/70" onClick={onCancel} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        aria-describedby="share-desc"
        tabIndex={-1}
        className="animate-sheet pb-safe relative w-full max-w-md rounded-t-3xl border-t border-line bg-surface px-6 pt-7 sm:animate-rise sm:rounded-3xl sm:border sm:pb-6"
      >
        <h2 id="share-title" className="text-2xl leading-tight font-semibold tracking-tight">
          Share your snaps with the room?
        </h2>
        <p id="share-desc" className="mt-2 text-muted">
          Shared snaps appear in the room feed and on the live board. You can change this any time from the top of
          the room.
        </p>
        <div className="mt-7 grid gap-2.5">
          <button
            type="button"
            data-autofocus
            onClick={() => onChoose("share")}
            className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-fg text-[17px] font-semibold text-canvas active:scale-[0.98]"
          >
            <UsersIcon />
            Share
          </button>
          <button
            type="button"
            onClick={() => onChoose("private")}
            className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-line-strong text-[17px] font-semibold active:scale-[0.98]"
          >
            <LockIcon />
            Only me
          </button>
        </div>
      </div>
    </div>
  );
}
