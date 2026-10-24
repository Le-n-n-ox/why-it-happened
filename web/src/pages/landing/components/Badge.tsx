import type { ReactNode } from "react";

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line/40 bg-surface-3 px-2.5 py-0.5 text-xs font-semibold leading-none ${tone}`}
    >
      {children}
    </span>
  );
}