"use client";
import { useCallback, useSyncExternalStore } from "react";
import { getSharePref, setSharePref, type SharePref } from "@/lib/device";

const EVENT = "backrow:share-pref";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The saved share choice (null until the first snap asks), kept in sync across components. */
export function useSharePref() {
  const pref = useSyncExternalStore(subscribe, getSharePref, () => null);
  const update = useCallback((next: SharePref) => {
    setSharePref(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [pref, update] as const;
}
