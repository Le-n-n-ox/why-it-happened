import { useEffect, useRef } from "react";

/**
 * Calls onFrame(elapsedMs) on every animation frame while `active`. With `durationMs` it stops after that
 * time, and the last call is exactly durationMs. Elapsed time restarts whenever `active` turns on.
 */
export function useFrame(active: boolean, onFrame: (elapsedMs: number) => void, durationMs?: number): void {
  const latest = useRef(onFrame);
  useEffect(() => {
    latest.current = onFrame;
  });

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (durationMs !== undefined && elapsed >= durationMs) {
        latest.current(durationMs);
        return;
      }
      latest.current(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, durationMs]);
}