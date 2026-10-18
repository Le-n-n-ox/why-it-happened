import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { AnalyticsStats } from "@/components/analytics/AnalyticsStats";
import { AttackPanel } from "@/components/analytics/AttackPanel";
import { PlayerRanking } from "@/components/analytics/PlayerRanking";
import {
  activityBuckets,
  attackSummary,
  attackZones,
  averageAdvance,
  ballTravel,
  countByType,
  countType,
  insightsByKind,
  playerStats,
  teamEventCounts,
} from "@/lib/analytics";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

export function AnalyticsPage() {
  const { shown, teams, insights } = useMatch();

  if (teams.length === 0) {
    return (
      <section className={ui.page}>
        <h2 className={ui.h2}>Analytics</h2>
        <p className={ui.empty}>Waiting for match data...</p>
      </section>
    );
  }

  const colors = teams.map((team) => teamColor(team, teams));
  const byType = countByType(shown, teams);
  const buckets = activityBuckets(shown, teams);
  const eventCounts = teamEventCounts(shown, teams);
  const advance = averageAdvance(shown, teams);
  const kinds = insightsByKind(insights);
  const insightCounts = teams.map((team) => insights.filter((insight) => insight.team === team).length);
  const travel = ballTravel(shown, teams);
  const cells = attackZones(shown, teams);
  const { rows: attackRows, leader } = attackSummary(cells, teams);
  const players = playerStats(shown);

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Analytics</h2>
      <p className={ui.empty}>Computed from {shown.length} events so far. Updates as the match plays.</p>
      <AnalyticsStats
        teams={teams}
        colors={colors}
        values={{
          goals: countType(shown, teams, "goal"),
          shots: countType(shown, teams, "shot"),
          passes: countType(shown, teams, "pass"),
          insights: insightCounts,
          travel,
        }}
      />
      <AttackPanel events={shown} teams={teams} colors={colors} zones={cells} rows={attackRows} leader={leader} />
      <PlayerRanking players={players} teams={teams} />
      <AnalyticsCharts
        teams={teams}
        colors={colors}
        byType={byType}
        buckets={buckets}
        eventCounts={eventCounts}
        kinds={kinds}
        advance={advance}
      />
    </section>
  );
}