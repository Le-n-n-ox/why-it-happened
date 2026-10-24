// web/src/components/RatingReceipt.tsx - the rating breakdown as a receipt. The lines sum to the rating.
import { formatRating } from "@/lib/players";
import { ui } from "@/lib/ui";
import type { RatingLine } from "@/types/types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function RatingReceipt({ lines, rating }: { lines: RatingLine[]; rating: number | null }) {
  if (lines.length === 0) return null;
  return (
    <section className={ui.panel} aria-label="Rating receipt">
      <h3 className={ui.h3}>Rating receipt</h3>
      <ul className="grid gap-2 text-[.9rem]">
        {lines.map((l, i) => (
          <li key={`${i}-${l.reason}`} className="flex items-baseline gap-2">
            <span className="leading-relaxed">{l.reason}</span>
            <span className="min-w-4 flex-1 border-b border-dotted border-line" aria-hidden="true" />
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[.85rem] font-semibold tabular-nums ${
                l.points >= 0
                  ? "bg-accent/10 text-accent"
                  : "bg-warn/10 text-warn"
              }`}
            >
              {l.points > 0 ? "+" : ""}{round2(l.points)}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-muted">Rating</span>
        <span className="font-heading text-2xl font-bold tabular-nums text-fg">{formatRating(rating)}</span>
      </p>
    </section>
  );
}