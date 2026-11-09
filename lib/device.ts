// Client-only helpers: anonymous device id + share preference. FROZEN.
// Works on plain http too (phone testing over LAN), where crypto.randomUUID is missing.

const DEVICE_KEY = "backrow_device_id";
const SHARE_KEY = "backrow_share_pref";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* insecure context: fall through */
    }
  }
  return "d_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function deviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export type SharePref = "share" | "private";

/** null means the user hasn't chosen yet: show the "Share your snaps?" modal on first snap. */
export function getSharePref(): SharePref | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(SHARE_KEY);
    return v === "share" || v === "private" ? v : null;
  } catch {
    return null;
  }
}

export function setSharePref(pref: SharePref): void {
  try {
    localStorage.setItem(SHARE_KEY, pref);
  } catch {
    /* ignore */
  }
}
