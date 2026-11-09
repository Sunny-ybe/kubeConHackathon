"use client";
import { CameraIcon } from "@/components/icons";

type Props = { busy: boolean; onSnap: () => void; label?: string };

/** Fixed bottom "Snap a slide" button, 64px tall, above the iOS home indicator. */
export default function SnapBar({ busy, onSnap, label = "Snap a slide" }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-canvas from-55% to-transparent px-4 pt-8 pb-safe">
      <button
        type="button"
        onClick={onSnap}
        disabled={busy}
        className="pointer-events-auto mx-auto flex h-16 w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-accent text-lg font-semibold tracking-tight text-on-accent transition-[transform,opacity] active:scale-[0.98] disabled:bg-raised disabled:text-fg"
      >
        <CameraIcon size={24} />
        {busy ? "Reading your snap…" : label}
      </button>
    </div>
  );
}
