import type { ReactNode } from "react";

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-current/30 bg-surface px-2.5 py-0.5 text-xs font-semibold leading-none ${tone}`}
    >
      {children}
    </span>
  );
}