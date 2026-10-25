import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

/**
 * Marks a region as "seen" once it scrolls into view. Descendants using the classes in
 * ../motion.ts then play. Do not nest Sequences: an outer one would trigger the inner one.
 */
export function Sequence({ children, className, threshold = 0.2 }: { children: ReactNode; className?: string; threshold?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>({ once: true, threshold });
  return (
    <div ref={ref} data-in={seen} className={cn("group/seq", className)}>
      {children}
    </div>
  );
}