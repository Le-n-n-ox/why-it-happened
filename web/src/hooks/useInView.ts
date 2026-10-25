import { useEffect, useRef, useState, type RefObject } from "react";

interface Options {
  once?: boolean; // stay true after the first time it is seen
  threshold?: number;
  rootMargin?: string;
}

/** [ref, inView]: attach `ref` to an element to learn whether it is on screen. */
export function useInView<T extends Element>(options: Options = {}): [RefObject<T | null>, boolean] {
  const { once = false, threshold = 0.25, rootMargin = "0px" } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  return [ref, inView];
}