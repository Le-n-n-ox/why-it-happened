// web/src/pages/ResultPage.tsx - full-time summary: recap, win probability, turning points, goals, the football reasons.
import { useState } from "react";
import { Button } from "@/components/Button";
import { ChainCard } from "@/components/ChainSteps";
import { FactorsPanel } from "@/components/FactorsPanel";
import { GoalHypotheses } from "@/components/GoalHypotheses";
import { Loader } from "@/components/Loader";
import { MatchVoices } from "@/components/MatchVoices";
import { Pitch } from "@/components/Pitch";
import { Recap } from "@/components/Recap";
import { WinProbability } from "@/components/WinProbability";
import { useApi } from "@/hooks/useApi";
import { getWhy } from "@/lib/api";
import { eventsByIds, formatMinute, kindLabel, stripCitations, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

function ResultBody() {
  const { teams, lang, allEvents, byId, pinned, pin } = useMatch();
  const { data, loading, error, retry } = useApi(getWhy, "now");
  const [openGoal, setOpenGoal] = useState<string | null>(null);
  const result = data?.result;
  const title = result ? (result.winner ? `Why ${result.winner} won` : "Why it finished level") : "Why the result happened";
  const selected = eventsByIds(pinned ?? [], byId);
  const goals = (result?.reasons ?? []).map((r) => ({ minute: r.minute, team: r.team }));

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>{title}</h2>
      {loading && <Loader label="Loading the summary" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't load the summary. <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}

      <div className={ui.split}>
        <div className="grid min-w-0 gap-4">
          <Recap lang={lang} />
          <MatchVoices />
          <WinProbability goals={goals} />

          {data && data.turning_points.length > 0 && (
            <section className="grid gap-2.5" aria-label="Turning points">
              <h3 className={ui.h3}>Turning points</h3>
              <ol className="grid gap-2.5">
                {data.turning_points.map((c, i) => (
                  <ChainCard key={c.insight_id} chain={c} rank={i + 1} color={teamColor(c.team, teams)} />
                ))}
              </ol>
            </section>
          )}

          {data && <FactorsPanel factors={data.factors} winner={data.result.winner} />}

          {result && (
            <section className="grid gap-2.5" aria-label="Why the result happened">
              <h3 className={ui.h3}>Why the result happened</h3>
              {result.reasons.length === 0 ? (
                <p className={ui.empty}>No goals to explain.</p>
              ) : (
                <ol className="grid gap-2.5">
                  {result.reasons.map((r, i) => {
                    const on = pinned !== null && pinned.join() === r.evidence.join();
                    // The goal itself is the last id of the chain, so that is what the backend expects.
                    const goalId = r.evidence[r.evidence.length - 1];
                    return (
                      <li
                        key={`${i}-${r.minute}`}
                        className={cn(
                          "grid gap-1.5 rounded-card border border-l-4 border-line bg-surface p-3",
                          on && "bg-surface-2",
                        )}
                        style={{ borderLeftColor: teamColor(r.team, teams) }}
                      >
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => pin(on ? null : r.evidence)}
                          className="grid w-full cursor-pointer gap-1 text-left"
                        >
                          <span className={ui.meta}>
                            <span className={ui.minute}>{formatMinute(r.minute)}</span>
                            <span className="font-bold" style={{ color: teamColor(r.team, teams) }}>{r.team}</span>
                            {r.caused_by && <span>{kindLabel(r.caused_by)}</span>}
                          </span>
                          <span lang={lang}>{stripCitations(r.text)}</span>
                        </button>
                        <div className={ui.chips}>
                          {r.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
                          {goalId && (
                            <Button
                              aria-pressed={openGoal === goalId}
                              onClick={() => setOpenGoal(openGoal === goalId ? null : goalId)}
                            >
                              {openGoal === goalId ? "Hide the claims" : "Why?"}
                            </Button>
                          )}
                        </div>
                        {openGoal === goalId && <GoalHypotheses goalId={goalId} teams={teams} />}
                        {r.insight_id && (
                          <a className={ui.link} href={`#/insight/${encodeURIComponent(r.insight_id)}`}>
                            Open insight →
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <p className={ui.empty}>Select a row to highlight its evidence on the pitch.</p>
            </section>
          )}
        </div>

        {teams.length > 0 && (
          <div className={ui.side}>
            <Pitch events={allEvents} selected={selected} teams={teams} />
          </div>
        )}
      </div>
    </section>
  );
}

export function ResultPage() {
  const { ended } = useMatch();
  if (!ended) {
    return (
      <section className={ui.page}>
        <h2 className={ui.h2}>Why the result happened</h2>
        <p className={ui.empty}>The summary appears at full time. Let the match play on the Live page.</p>
      </section>
    );
  }
  return <ResultBody />;
}