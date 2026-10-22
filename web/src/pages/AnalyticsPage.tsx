// web/src/pages/AnalyticsPage.tsx - the team reports beside the analysis of the event list.
import { AttackPanel } from "@/components/analytics/AttackPanel";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { AnalyticsStats } from "@/components/analytics/AnalyticsStats";
import { PlayerRanking } from "@/components/analytics/PlayerRanking";
import { Button } from "@/components/Button";
import { Donut, GroupedBars, Legend, type Series } from "@/components/charts";
import { Loader } from "@/components/Loader";
import { Verdict } from "@/components/Verdict";
import { useApi } from "@/hooks/useApi";
import { getAssessment } from "@/lib/api";
import {
  activityBuckets, attackSummary, attackZones, averageAdvance, ballTravel, countByType, countType,
  insightsByKind, playerStats,
} from "@/lib/analytics";
import { teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const loadAssessments = (key: string) =>
  Promise.all(key.split("|").filter(Boolean).map((t) => getAssessment(t)));

export function AnalyticsPage() {
  const { teams, allEvents, insights } = useMatch();
  const { data, loading, error, retry } = useApi(loadAssessments, teams.join("|"));
  const reports = data ?? [];

  if (teams.length === 0) {
    return (
      <section className={ui.page}>
        <h2 className={ui.h2}>Analytics</h2>
        <p className={ui.empty}>Waiting for match data...</p>
      </section>
    );
  }

  const colors = teams.map((t) => teamColor(t, teams));
  const keys = [...new Set(reports.flatMap((r) => Object.keys(r.metrics)))].filter((k) =>
    reports.every((r) => typeof r.metrics[k] === "number"),
  );
  const series: Series[] = reports.map((r, i) => ({
    name: r.team,
    color: colors[teams.indexOf(r.team)] ?? colors[i],
    values: keys.map((k) => r.metrics[k]),
  }));

  // Everything below is counted in the browser from the event list, so it is labelled as such.
  const byType = countByType(allEvents, teams);
  const buckets = activityBuckets(allEvents, teams);
  const eventCounts = allEvents.length ? teams.map((t) => allEvents.filter((e) => e.team === t).length) : [];
  const kinds = insightsByKind(insights);
  const advance = averageAdvance(allEvents, teams);
  const cells = attackZones(allEvents, teams);
  const { rows, leader } = attackSummary(cells, teams);
  const ranking = playerStats(allEvents);
  const insightCounts = teams.map((t) => insights.filter((i) => i.team === t).length);
  const travel = ballTravel(allEvents, teams);

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Analytics</h2>
      <p className={ui.empty}>
        The team verdicts and the team metrics come from the team reports the server sends. The panels
        below are counted in the browser from the event list in /events, so they are tallies of what the
        data contains, not server statistics.
      </p>
      {loading && <Loader label="Loading team reports" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't load the team reports ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}

      {reports.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {reports.map((r) => (
              <a
                key={r.team}
                href={`#/team/${encodeURIComponent(r.team)}`}
                className="grid gap-2 rounded-card border border-line bg-surface px-4 py-3.5 text-fg transition-colors hover:bg-surface-2"
              >
                <span className="font-bold" style={{ color: teamColor(r.team, teams) }}>{r.team}</span>
                <Verdict verdict={r.verdict} />
                <span className="font-heading text-2xl font-bold tabular-nums">Score {r.score}</span>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
            {keys.length > 0 && (
              <section className={`${ui.panel} min-w-0`} aria-label="Team metrics">
                <h3 className="m-0 text-base font-bold">Team metrics</h3>
                <p className={ui.empty}>From the team reports the server sends.</p>
                <Legend series={series} />
                <GroupedBars label="Team metrics" categories={keys.map(prettyKey)} series={series} />
              </section>
            )}
            <section className={`${ui.panel} min-w-0`} aria-label="Share of shots">
              <h3 className="m-0 text-base font-bold">Shots</h3>
              <p className={ui.empty}>From the team reports the server sends.</p>
              <Donut
                label="Shots by team"
                centerLabel="shots"
                slices={reports.map((r, i) => ({
                  label: r.team,
                  value: r.metrics["shots"] ?? 0,
                  color: colors[teams.indexOf(r.team)] ?? colors[i],
                }))}
              />
            </section>
          </div>

          <section aria-label="Match tallies">
            <h3 className={ui.h3}>Match tallies</h3>
            <p className={ui.empty}>Counted in the browser from the event list in /events.</p>
            <AnalyticsStats
              teams={teams}
              colors={colors}
              values={{
                goals: countType(allEvents, teams, "goal"),
                shots: countType(allEvents, teams, "shot"),
                passes: countType(allEvents, teams, "pass"),
                insights: insightCounts,
                travel,
              }}
            />
          </section>

          <AnalyticsCharts
            teams={teams}
            colors={colors}
            byType={byType}
            buckets={buckets}
            eventCounts={eventCounts}
            kinds={kinds}
            advance={advance}
          />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
            <AttackPanel events={allEvents} teams={teams} colors={colors} rows={rows} leader={leader} cells={cells} />
            <PlayerRanking players={ranking} teams={teams} />
          </div>
        </>
      )}
    </section>
  );
}
