"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./motion";

const DURATION_MS = 600;

/** A number that counts up (or down) to `value` over ~600ms. Jumps straight there under reduced motion. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = Math.round(from + (value - from) * eased);
      fromRef.current = n;
      setShown(n);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <span className={className}>{(reduced ? value : shown).toLocaleString("en-US")}</span>;
}
