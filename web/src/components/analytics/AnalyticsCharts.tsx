import { Donut, GroupedBars, Legend, LineChart, type Series } from "@/components/charts";
import { kindLabel } from "@/lib/match";
const PALETTE = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
type InsightKindCount = { kind: string; count: number };
type CountByType = ReturnType<typeof import("@/lib/analytics").countByType>;
type ActivityBuckets = ReturnType<typeof import("@/lib/analytics").activityBuckets>;

interface AnalyticsChartsProps {
  teams: string[];
  colors: string[];
  byType: CountByType;
  buckets: ActivityBuckets;
  eventCounts: number[];
  kinds: InsightKindCount[];
  advance: number[];
}

export function AnalyticsCharts({ teams, colors, byType, buckets, eventCounts, kinds, advance }: AnalyticsChartsProps) {
  const toSeries = (rows: number[][]): Series[] =>
    teams.map((team, index) => ({ name: team, color: colors[index], values: rows[index] }));
  return (
    <div className="charts">
      <section className="panel" aria-label="Events by type"><h3>Events by type</h3><Legend series={toSeries(byType.counts)} /><GroupedBars label="Events by type" categories={byType.types.map(cap)} series={toSeries(byType.counts)} /></section>
      <section className="panel" aria-label="Activity over time"><h3>Activity per 5 minutes</h3><Legend series={toSeries(buckets.counts)} /><LineChart label="Events per 5-minute window" labels={buckets.labels} series={toSeries(buckets.counts)} /></section>
      <section className="panel" aria-label="Share of recorded events"><h3>Share of recorded events</h3><Donut label="Share of recorded events" centerLabel="events" slices={teams.map((team, index) => ({ label: team, value: eventCounts[index], color: colors[index] }))} /></section>
      <section className="panel" aria-label="Insights by type"><h3>Insights by type</h3>{kinds.length === 0 ? <p className="empty">No insights yet.</p> : <Donut label="Insights by type" centerLabel="insights" slices={kinds.map((kind, index) => ({ label: kindLabel(kind.kind), value: kind.count, color: PALETTE[index % PALETTE.length] }))} />}</section>
      <section className="panel panel--span" aria-label="Territory"><h3>Average advancement</h3><p className="empty">0 is a team's own goal line, 100 is the opponent's.</p>{teams.map((team, index) => <div key={team} className="meter-row"><span className="meter-row__name" style={{ color: colors[index] }}>{team}</span><div className="meter" role="img" aria-label={`${team} average advancement ${advance[index]} of 100`}><span style={{ width: `${advance[index]}%`, background: colors[index] }} /></div><span className="meter-row__val">{advance[index]}</span></div>)}</section>
    </div>
  );
}
