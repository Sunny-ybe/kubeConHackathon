"use client";
import { CameraIcon, ImageIcon } from "@/components/icons";

type Props = { busy: boolean; onSnap: () => void; onUpload?: () => void; label?: string };

/** Fixed bottom "Snap a slide" button, 64px tall, above the iOS home indicator. Hosted rooms add Upload photos. */
export default function SnapBar({ busy, onSnap, onUpload, label = "Snap a slide" }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-canvas from-55% to-transparent px-4 pt-8 pb-safe">
      <div className="pointer-events-auto mx-auto flex max-w-md gap-2.5">
        <button
          type="button"
          onClick={onSnap}
          disabled={busy}
          className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-accent text-lg font-semibold tracking-tight text-on-accent transition-[transform,opacity] active:scale-[0.98] disabled:bg-raised disabled:text-fg"
        >
          <CameraIcon size={24} />
          {busy && !onUpload ? "Reading your snap…" : label}
        </button>
        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            disabled={busy}
            className="flex h-16 flex-1 items-center justify-center gap-2.5 rounded-2xl border border-line-strong bg-raised text-lg font-semibold tracking-tight transition-[transform,opacity] active:scale-[0.98] disabled:opacity-50"
          >
            <ImageIcon size={24} className="text-muted" />
            Upload photos
          </button>
        )}
      </div>
    </div>
  );
}
