// web/src/components/GoalHypotheses.tsx - the claims tested for one goal, and what the test said.
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getGoalHypotheses } from "@/lib/api";
import {
  claimWindow, countsLabel, describeWhere, measureLabel, valueLabel, verdictTone, VERDICT_LABELS,
} from "@/lib/hypotheses";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { HypothesisClaim } from "@/types/types";

interface Props {
  goalId: string;
  teams: string[];
}

const MODES: { id: "auto" | "sweep"; label: string; note: string }[] = [
  { id: "auto", label: "Model proposals", note: "The model proposes the claims; the rules test them." },
  { id: "sweep", label: "Rules sweep", note: "A fixed grid of patterns, tested by the equations alone." },
];

function Badge({ children, tone = "quiet" }: { children: string; tone?: "quiet" | "accent" | "warn" }) {
  const toneClass =
    tone === "accent" ? "bg-accent text-accent-ink" : tone === "warn" ? "bg-warn text-black" : "bg-surface-2 text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${toneClass}`}>{children}</span>
  );
}

/** The claim in words: what the model said, or what the claim was about. */
function claimTitle(claim: HypothesisClaim): string {
  if (claim.statement) return claim.statement;
  return `${claim.team}'s ${describeWhere(claim.where)} in ${claimWindow(claim)}`;
}

function ClaimCard({ claim, teams }: { claim: HypothesisClaim; teams: string[] }) {
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
    </li>
  );
}

/**
 * The panel for one goal. The claims are fetched when the panel is opened, never before.
 */
export function GoalHypotheses({ goalId, teams }: Props) {
  const [mode, setMode] = useState<"auto" | "sweep">("auto");
  const load = useCallback((m: "auto" | "sweep") => getGoalHypotheses(goalId, m), [goalId]);
  const { data, loading, error, notFound, retry } = useApi(load, mode);

  return (
    <section className="grid gap-2.5 rounded-card border border-line bg-surface-2 p-3.5" aria-label="Tested claims">
      <p className="m-0 text-[.88rem] leading-snug">
        The model proposes a claim, the rules count the events and decide, so a claim the data does
        not support is shown as not supported.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold">Claims</span>
        {MODES.map((m) => (
          <Button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Button>
        ))}
      </div>
      <p className="m-0 text-[.82rem] text-muted">{MODES.find((m) => m.id === mode)?.note}</p>

      {loading && <Loader label="Testing the claims" />}
      {error !== null && notFound && (
        <p className={ui.empty}>This goal is not in the match data, so no claim can be tested for it.</p>
      )}
      {error !== null && !notFound && (
        <p role="alert" className={ui.banner}>
          Couldn't test the claims ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}

      {data && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.source === "model" ? "accent" : "quiet"}>
              {data.source === "model" ? "The model proposed these claims" : "Rules-only sweep"}
            </Badge>
            {data.alpha !== null && (
              <span className="text-[.82rem] text-muted">
                The bar is {data.alpha} after correcting for {data.hypotheses.length} claim
                {data.hypotheses.length === 1 ? "" : "s"} tested.
              </span>
            )}
          </div>

          {data.summary && <p className="m-0 text-[.88rem]">{data.summary}</p>}

          {data.hypotheses.length === 0 ? (
            <p className={ui.empty}>
              {data.source === "model"
                ? "The model proposed no claim about this goal that could be tested."
                : "The sweep tested a fixed grid of patterns and none of them was supported. That is the equations-only baseline, so it is a floor, not a verdict on the goal."}
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {data.hypotheses.map((claim, i) => (
                <ClaimCard key={`${claim.team}-${i}`} claim={claim} teams={teams} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
