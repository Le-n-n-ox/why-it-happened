// web/src/AnimatedNumber.tsx - counts up/down to a new integer. Skips the animation for reduced motion.
import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  const reduce = prefersReducedMotion();

  useEffect(() => {
    if (reduce || current.current === value) return;
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (value - from) * eased;
      setShown(current.current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return <>{Math.round(reduce ? value : shown)}</>;
}