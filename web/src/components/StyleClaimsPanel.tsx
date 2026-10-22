// web/src/components/StyleClaimsPanel.tsx - claims about how a team played across the whole match.
import { useCallback, useState } from "react";
import { Badge, ClaimList } from "@/components/claims/ClaimList";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getTeamClaims } from "@/lib/api";
import { formatMinute } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const MODES: { id: "auto" | "sweep"; label: string; note: string }[] = [
  { id: "auto", label: "Model proposals", note: "The model proposes the claims; the rules test them." },
  { id: "sweep", label: "Rules sweep", note: "A fixed grid of patterns, tested by the equations alone." },
];

export function StyleClaimsPanel({ team }: { team: string }) {
  const { teams } = useMatch();
  const [mode, setMode] = useState<"auto" | "sweep">("auto");
  const load = useCallback((m: "auto" | "sweep") => getTeamClaims(team, m), [team]);
  const { data, loading, error, retry } = useApi(load, mode);

  return (
    <section className={ui.panel} aria-label="Claims about how the team played">
      <h3 className={ui.h3}>How {team} played, tested</h3>
      <p className={ui.empty}>
        Claims about the team's whole approach, not one spell, so the window is long and the test has
        more data behind it. The same tests decide.
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
      {error !== null && (
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
            <span className="text-[.82rem] text-muted">
              The window is {formatMinute(data.window.from)} to {formatMinute(data.window.to)}.
            </span>
            {data.alpha !== null && (
              <span className="text-[.82rem] text-muted">
                The bar is {data.alpha} after correcting for {data.hypotheses.length} claim
                {data.hypotheses.length === 1 ? "" : "s"} tested.
              </span>
            )}
          </div>

          {data.hypotheses.length === 0 ? (
            <p className={ui.empty}>
              {data.source === "model"
                ? "The model proposed no claim about this team that could be tested."
                : "The sweep tested a fixed grid of patterns and none of them was supported. That is the equations-only baseline, so it is a floor, not a verdict on the team."}
            </p>
          ) : (
            <ClaimList claims={data.hypotheses} teams={teams} />
          )}
        </>
      )}
    </section>
  );
}
