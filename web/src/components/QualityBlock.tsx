// web/src/components/QualityBlock.tsx - pass quality inside the event detail. Routine passes need no badge.
import { EvidenceChips } from "@/components/EvidenceChips";
import { cn } from "@/lib/utils";
import type { PassQuality } from "@/types/types";

const BADGE: Record<string, string> = {
  excellent: "bg-accent text-accent-ink shadow-sm",
  good: "bg-accent/25 text-fg",
  unsuccessful: "bg-surface-3 text-fg",
  poor: "bg-warn text-black shadow-sm",
};

const pct = (n: number): number => Math.min(100, Math.max(0, n * 100));

/** danger_before / danger_after are 0 to 1: the chance of a goal from the ball's position. */
function Danger({ before, after }: { before: number; after: number }) {
  const rows = [["Before", before], ["After", after]] as const;
  return (
    <div
      className="grid gap-1.5"
      role="img"
      aria-label={`Chance of a goal from the ball's position: ${Math.round(pct(before))}% before, ${Math.round(pct(after))}% after`}
    >
      <p className="m-0 text-[.75rem] font-semibold uppercase tracking-wider text-muted">
        Chance of a goal from there
      </p>
      {rows.map(([label, v]) => (
        <div key={label} className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5ch] items-center gap-2 text-[.75rem] text-muted">
          <span>{label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.max(pct(v), 1.5)}%` }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums text-fg">{Math.round(pct(v))}%</span>
        </div>
      ))}
    </div>
  );
}

export function QualityBlock({ quality }: { quality: PassQuality | null | undefined }) {
  if (!quality) return null;
  const badge = BADGE[quality.rating]; // "routine" has none
  const reasons = quality.reasons ?? [];
  const measures = [
    typeof quality.distance_m === "number" ? `${Math.round(quality.distance_m)} m` : null,
    typeof quality.accuracy === "number" ? (quality.accuracy >= 0.5 ? "completed" : "incomplete") : null,
    quality.difficulty_rating ? quality.difficulty_rating.replace(/_/g, " ") : null,
  ].filter((value): value is string => value !== null);
  if (badge === undefined && reasons.length === 0 && measures.length === 0) return null;
  const before = quality.danger_before;
  const after = quality.danger_after;

  return (
    <div className="grid gap-2.5 rounded-card border border-line bg-surface-2 px-4 py-3.5" role="group" aria-label="Pass quality">
      <p className="m-0 flex flex-wrap items-center gap-2">
        <span className="font-semibold">Pass quality</span>
        {badge !== undefined && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", badge)}>
            {quality.rating}
          </span>
        )}
      </p>

      {measures.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {measures.map((measure) => (
            <span key={measure} className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {measure}
            </span>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="grid list-disc gap-1.5 pl-5 text-[.95rem]">
          {reasons.map((r, i) => (
            <li key={`${i}-${r.code}`}>
              <span
                title={r.principle}
                tabIndex={r.principle ? 0 : undefined}
                className={cn(
                  r.principle && "cursor-help decoration-dotted underline-offset-4 hover:underline",
                  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
              >
                {r.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {typeof before === "number" && typeof after === "number" && <Danger before={before} after={after} />}

      <EvidenceChips ids={quality.evidence ?? []} />
    </div>
  );
}