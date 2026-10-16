// web/src/pages/AnalyticsPage.tsx - live stats and charts, computed from the events seen so far.
import { AnimatedNumber } from "../AnimatedNumber";
import {
  activityBuckets, averageAdvance, countByType, countType, insightsByKind, teamEventCounts,
} from "../analytics";
import { Donut, GroupedBars, Legend, LineChart, type Series } from "../charts";
import { kindLabel, teamColor } from "../match";
import { useMatch } from "../matchContext";

const PALETTE = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

interface StatProps {
  title: string;
  teams: string[];
  colors: string[];
  values: number[];
}

function StatCard({ title, teams, colors, values }: StatProps) {
  return (
    <div className="stat">
      <h3 className="stat__title">{title}</h3>
      {teams.map((t, i) => (
        <div key={t} className="stat__row">
          <span style={{ color: colors[i] }}>{t}</span>
          <span className="stat__num"><AnimatedNumber value={values[i]} /></span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const { shown, teams, insights } = useMatch();

  if (teams.length === 0) {
    return (
      <section className="page">
        <h2>Analytics</h2>
        <p className="empty">Waiting for match data...</p>
      </section>
    );
  }

  const colors = teams.map((t) => teamColor(t, teams));
  const toSeries = (rows: number[][]): Series[] =>
    teams.map((t, i) => ({ name: t, color: colors[i], values: rows[i] }));

  const byType = countByType(shown, teams);
  const buckets = activityBuckets(shown, teams);
  const eventCounts = teamEventCounts(shown, teams);
  const advance = averageAdvance(shown, teams);
  const kinds = insightsByKind(insights);
  const insightCounts = teams.map((t) => insights.filter((i) => i.team === t).length);

  return (
    <section className="page page--wide">
      <h2>Analytics</h2>
      <p className="empty">Computed from {shown.length} events so far. Updates as the match plays.</p>

      <div className="stats">
        <StatCard title="Goals" teams={teams} colors={colors} values={countType(shown, teams, "goal")} />
        <StatCard title="Shots" teams={teams} colors={colors} values={countType(shown, teams, "shot")} />
        <StatCard title="Passes" teams={teams} colors={colors} values={countType(shown, teams, "pass")} />
        <StatCard title="Insights found" teams={teams} colors={colors} values={insightCounts} />
      </div>

      <div className="charts">
        <section className="panel" aria-label="Events by type">
          <h3>Events by type</h3>
          <Legend series={toSeries(byType.counts)} />
          <GroupedBars
            label="Events by type"
            categories={byType.types.map(cap)}
            series={toSeries(byType.counts)}
          />
        </section>

        <section className="panel" aria-label="Activity over time">
          <h3>Activity per 5 minutes</h3>
          <Legend series={toSeries(buckets.counts)} />
          <LineChart label="Events per 5-minute window" labels={buckets.labels} series={toSeries(buckets.counts)} />
        </section>

        <section className="panel" aria-label="Share of events">
          <h3>Share of recorded events</h3>
          <Donut
            label="Share of recorded events"
            centerLabel="events"
            slices={teams.map((t, i) => ({ label: t, value: eventCounts[i], color: colors[i] }))}
          />
        </section>

        <section className="panel" aria-label="Insights by type">
          <h3>Insights by type</h3>
          {kinds.length === 0 ? (
            <p className="empty">No insights yet.</p>
          ) : (
            <Donut
              label="Insights by type"
              centerLabel="insights"
              slices={kinds.map((k, i) => ({
                label: kindLabel(k.kind),
                value: k.count,
                color: PALETTE[i % PALETTE.length],
              }))}
            />
          )}
        </section>

        <section className="panel panel--span" aria-label="Territory">
          <h3>Average advancement</h3>
          <p className="empty">0 is a team's own goal line, 100 is the opponent's.</p>
          {teams.map((t, i) => (
            <div key={t} className="meter-row">
              <span className="meter-row__name" style={{ color: colors[i] }}>{t}</span>
              <div className="meter" role="img" aria-label={`${t} average advancement ${advance[i]} of 100`}>
                <span style={{ width: `${advance[i]}%`, background: colors[i] }} />
              </div>
              <span className="meter-row__val">{advance[i]}</span>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}