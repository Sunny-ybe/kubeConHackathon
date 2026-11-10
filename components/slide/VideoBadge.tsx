import { PlayIcon } from "@/components/icons";

/** "0:42" from seconds. */
export function formatDuration(s?: number): string {
  if (!s || !Number.isFinite(s)) return "";
  const t = Math.max(1, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** Play badge with the duration, for video posters (cards, search thumbs). Sits in a relative box. */
export default function VideoBadge({ duration, small }: { duration?: number; small?: boolean }) {
  const d = formatDuration(duration);
  return (
    <span
      className={`absolute flex items-center rounded-full bg-black/75 font-semibold text-white tabular-nums ${
        small ? "bottom-1.5 left-1.5 h-6 gap-1 pr-2 pl-1.5 text-xs" : "bottom-2.5 left-2.5 h-8 gap-1.5 pr-3 pl-2 text-[13px]"
      }`}
    >
      <PlayIcon size={small ? 12 : 15} />
      <span className="sr-only">Video</span>
      {d && <span>{d}</span>}
    </span>
  );
}
