// web/src/components/FactorsList.tsx - factors as cards. Evidence can be highlighted on the pitch.
import { Button } from "@/components/Button";
import type { FactorView } from "@/lib/extras";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function FactorsList({ items }: { items: FactorView[] }) {
  const { teams, pinned, pin } = useMatch();
  if (items.length === 0) return null;
  return (
    <ul className="grid gap-2.5">
      {items.map((f, i) => {
        const on = pinned !== null && pinned.join() === f.evidence.join();
        return (
          <li
            key={`${i}-${f.title}`}
            className={cn("grid gap-1.5 rounded-card bg-surface-2 px-3.5 py-3", f.team && "border-l-4")}
            style={f.team ? { borderLeftColor: teamColor(f.team, teams) } : undefined}
          >
            <p className="m-0 flex items-baseline justify-between gap-2 font-semibold">
              <span>{f.title}</span>
              {f.points !== undefined && (
                <span className={cn("font-mono text-[.9rem] tabular-nums", f.points >= 0 ? "text-accent" : "text-warn")}>
                  {f.points > 0 ? "+" : ""}{round2(f.points)}
                </span>
              )}
            </p>
            {f.detail && <p className="m-0 text-[.95rem]">{f.detail}</p>}
            {f.evidence.length > 0 && (
              <div className={ui.chips}>
                {f.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
                <Button className="px-2.5 py-0.5 text-xs" aria-pressed={on} onClick={() => pin(on ? null : f.evidence)}>
                  Highlight on pitch
                </Button>
              </div>
            )}
            {f.insightId && (
              <a className={ui.link} href={`#/insight/${encodeURIComponent(f.insightId)}`}>Open insight →</a>
            )}
          </li>
        );
      })}
    </ul>
  );
}