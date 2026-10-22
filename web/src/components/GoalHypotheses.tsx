// web/src/components/GoalHypotheses.tsx - the claims tested for one goal, and what the test said.
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { Badge, ClaimList } from "@/components/claims/ClaimList";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getGoalHypotheses } from "@/lib/api";
import { ui } from "@/lib/ui";

interface Props {
  goalId: string;
  teams: string[];
}

const MODES: { id: "auto" | "sweep"; label: string; note: string }[] = [
  { id: "auto", label: "Model proposals", note: "The model proposes the claims; the rules test them." },
  { id: "sweep", label: "Rules sweep", note: "A fixed grid of patterns, tested by the equations alone." },
];

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
            <ClaimList claims={data.hypotheses} teams={teams} />
          )}
        </>
      )}
    </section>
  );
}
