"use client";
import { LockIcon, UsersIcon } from "@/components/icons";
import { useSharePref } from "@/components/hooks/useSharePref";

/** Header switch for the share choice. No choice yet counts as sharing, like the snap request. */
export default function ShareToggle() {
  const [pref, setPref] = useSharePref();
  const shared = pref !== "private";
  return (
    <button
      type="button"
      aria-pressed={shared}
      aria-label="Share my snaps with the room"
      onClick={() => setPref(shared ? "private" : "share")}
      className="flex min-h-12 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:text-fg"
    >
      <span
        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 ${
          shared ? "border-success/30 text-success" : "border-line-strong text-fg"
        }`}
      >
        {shared ? <UsersIcon size={16} /> : <LockIcon size={16} />}
        {shared ? "Shared" : "Only me"}
      </span>
    </button>
  );
}
