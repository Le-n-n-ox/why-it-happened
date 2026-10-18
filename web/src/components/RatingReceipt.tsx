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
      <ul className="grid gap-1.5 text-[.9rem]">
        {lines.map((l, i) => (
          <li key={`${i}-${l.reason}`} className="flex items-baseline gap-2">
            <span>{l.reason}</span>
            <span className="min-w-4 flex-1 border-b border-dotted border-line" aria-hidden="true" />
            <span className={`font-mono tabular-nums ${l.points >= 0 ? "text-accent" : "text-warn"}`}>
              {l.points > 0 ? "+" : ""}{round2(l.points)}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 flex items-baseline justify-between border-t border-line pt-2 font-bold">
        <span>Rating</span>
        <span className="font-heading text-xl tabular-nums">{formatRating(rating)}</span>
      </p>
    </section>
  );
}