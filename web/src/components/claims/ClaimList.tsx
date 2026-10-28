// web/src/components/claims/ClaimList.tsx - the tested claims, and what the test said about each.
import type { ReactNode } from "react";
import { EvidenceChips } from "@/components/EvidenceChips";
import { claimWindow, countsLabel, describeWhere, measureLabel, valueLabel, verdictTone, VERDICT_LABELS } from "@/lib/hypotheses";
import { teamColor } from "@/lib/match";
import type { HypothesisClaim } from "@/types/types";

export function Badge({ children, tone = "quiet" }: { children: ReactNode; tone?: "quiet" | "accent" | "warn" }) {
  const toneClass =
    tone === "accent" ? "bg-accent text-accent-ink" : tone === "warn" ? "bg-warn text-black" : "bg-surface-2 text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${toneClass}`}>{children}</span>
  );
}

/** The claim in words: what the model said, or what the claim was about. */
export function claimTitle(claim: HypothesisClaim): string {
  if (claim.statement) return claim.statement;
  return `${claim.team}'s ${describeWhere(claim.where)} in ${claimWindow(claim)}`;
}

export function ClaimCard({ claim, teams }: { claim: HypothesisClaim; teams: string[] }) {
  const tone = verdictTone(claim.verdict);
  const value = valueLabel(claim);
  return (
    <li className="grid gap-1.5 rounded-card border border-line bg-surface px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{VERDICT_LABELS[claim.verdict]}</Badge>
        <span className="text-[.8rem]" style={{ color: teamColor(claim.team, teams) }}>{claim.team}</span>
        <span className="text-[.8rem] text-muted">{claimWindow(claim)}</span>
      </div>

      <p className="m-0 font-semibold">{claimTitle(claim)}</p>

      {claim.text && <p className="m-0 leading-snug">{claim.text}</p>}

      <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[.82rem] text-muted">
        <div className="flex gap-1.5">
          <dt>Measured</dt>
          <dd className="m-0 font-semibold text-fg tabular-nums">
            {value ?? "not measured"} {value ? measureLabel(claim.measure) : ""}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Counts</dt>
          <dd className="m-0 font-semibold text-fg tabular-nums">{countsLabel(claim)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>p-value</dt>
          <dd className="m-0 font-semibold text-fg tabular-nums">
            {claim.p_value === null ? "not available" : claim.p_value}
          </dd>
        </div>
      </dl>

      <EvidenceChips ids={claim.evidence} />
      {claim.candidates && claim.candidates.length > claim.evidence.length && (
        <p className="m-0 text-[.8rem] text-muted">
          {claim.evidence.length} of {claim.candidates.length} candidate events, chosen by the model.
        </p>
      )}
    </li>
  );
}

/** The claims of one report, each as a card. */
export function ClaimList({ claims, teams }: { claims: HypothesisClaim[]; teams: string[] }) {
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {claims.map((claim, i) => (
        <ClaimCard key={`${claim.team}-${i}`} claim={claim} teams={teams} />
      ))}
    </ul>
  );
}
