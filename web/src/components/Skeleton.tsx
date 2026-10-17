// web/src/components/Skeleton.tsx - shimmering placeholder block.
import { cn } from "../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-24 animate-shimmer rounded-card bg-[linear-gradient(90deg,var(--surface)_25%,var(--surface-2)_37%,var(--surface)_63%)] bg-[length:400%_100%]",
        className,
      )}
    />
  );
}