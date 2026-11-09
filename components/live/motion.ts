"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when the viewer asked the OS for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

export const STAGE_W = 1920;
export const STAGE_H = 1080;

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/** Scale factor that fits a 1920x1080 stage into the current window. */
export function useStageScale(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H),
    () => 1,
  );
}

/**
 * Plays a short Web Animations keyframe on the element whenever `trigger` changes
 * (not on first render). Skipped under prefers-reduced-motion.
 */
export function useFlashOnChange<T extends HTMLElement>(trigger: unknown, keyframes: Keyframe[], duration = 700) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    ref.current?.animate(keyframes, { duration, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    // keyframes is a static literal at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, reduced, duration]);
  return ref;
}

/** Fades (and slightly lifts) the element in when it mounts. Skipped under prefers-reduced-motion. */
export function useFadeIn<T extends HTMLElement>(duration = 600) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    ref.current?.animate(
      [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [reduced, duration]);
  return ref;
}
