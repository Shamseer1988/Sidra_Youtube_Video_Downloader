"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 up to `target` with an ease-out curve once on mount.
 * Returns the current animated value (respects decimals of the target).
 */
export function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const decimals = Number.isInteger(target) ? 0 : 1;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}
