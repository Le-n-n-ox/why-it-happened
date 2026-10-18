// web/src/components/QualityBlock.tsx - the quality block on a pass's detail view. Shows only what the server sent.
import { readQuality } from "@/lib/extras";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function QualityBlock({ raw, title = "Quality" }: { raw: unknown; title?: string }) {
  const q = readQuality(raw);
  if (!q) return null;
  return (
    <div className="grid gap-2 rounded-card border border-line bg-surface-2 px-3.5 py-3" role="group" aria-label={title}>
      <p className="m-0 flex flex-wrap items-center gap-2">
        <span className="font-semibold">{title}</span>
        {q.label && (
          <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">{q.label}</span>
        )}
        {q.score !== undefined && <span className="font-heading font-bold tabular-nums">{round2(q.score)}</span>}
      </p>
      {q.text && <p className="m-0 text-[.95rem]">{q.text}</p>}
      {q.lines.length > 0 && (
        <ul className="grid gap-1.5 text-[.9rem]">
          {q.lines.map((l, i) => (
            <li key={`${i}-${l.reason}`} className="flex items-baseline gap-2">
              <span>{l.reason}</span>
              {l.value !== undefined && (
                <>
                  <span className="min-w-4 flex-1 border-b border-dotted border-line" aria-hidden="true" />
                  <span className={cn("font-mono tabular-nums", l.value >= 0 ? "text-accent" : "text-warn")}>
                    {l.value > 0 ? "+" : ""}{round2(l.value)}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {q.evidence.length > 0 && (
        <div className={ui.chips}>
          {q.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
        </div>
      )}
    </div>
  );
}