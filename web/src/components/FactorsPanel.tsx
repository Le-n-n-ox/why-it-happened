// web/src/components/FactorsPanel.tsx - the football reasons behind the result, winner's side first.
import { EvidenceChips } from "@/components/EvidenceChips";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { Factor } from "@/types/types";

function FactorCard({ f }: { f: Factor }) {
  const { teams } = useMatch();
  return (
    <li
      className="grid gap-1.5 rounded-card border border-l-4 border-line bg-surface p-3.5 transition-colors hover:border-accent/30 hover:bg-surface-2/30"
      style={{ borderLeftColor: teamColor(f.favours || f.team, teams) }}
    >
      <p className="m-0 flex flex-wrap items-baseline gap-2 font-semibold">
        <span>{f.title}</span>
        <span className={ui.quiet}>{f.effect}</span>
      </p>
      <p className="m-0 text-[.95rem] leading-relaxed">{f.detail}</p>
      {f.principle && (
        <p
          className="m-0 rounded-md border-l-2 border-line bg-surface-2/50 px-2.5 py-1.5 text-[.8rem] leading-relaxed text-muted"
          title={f.principle}
        >
          <span className="font-semibold text-fg">Why this matters: </span>{f.principle}
        </p>
      )}
      <EvidenceChips ids={f.evidence} />
    </li>
  );
}

/** Factors that favour the winner come first, then one "going the other way" group. Server order is kept inside each. */
export function FactorsPanel({ factors, winner }: { factors: Factor[]; winner: string | null }) {
  if (factors.length === 0) return null;
  const favouring = winner ? factors.filter((f) => f.favours === winner) : factors;
  const against = winner ? factors.filter((f) => f.favours !== winner) : [];

  return (
    <section className="grid gap-4" aria-label="The football reasons">
      <h3 className={ui.h3}>The football reasons</h3>
      {favouring.length > 0 && (
        <div className="grid gap-2.5">
          {winner && (
            <h4 className="m-0 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Working for {winner}
            </h4>
          )}
          <ul className="grid gap-2.5">{favouring.map((f) => <FactorCard key={f.code} f={f} />)}</ul>
        </div>
      )}
      {against.length > 0 && (
        <div className="grid gap-2.5">
          <h4 className="m-0 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
            <span className="size-1.5 rounded-full bg-muted" aria-hidden="true" />
            Going the other way
          </h4>
          <ul className="grid gap-2.5">{against.map((f) => <FactorCard key={f.code} f={f} />)}</ul>
        </div>
      )}
    </section>
  );
}