import { Donut, GroupedBars, Legend, LineChart, type Series } from "@/components/charts";
import type { activityBuckets, countByType } from "@/lib/analytics";
import { kindLabel } from "@/lib/match";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

const PALETTE = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const PANEL = cn(ui.panel, "min-w-0");
const PANEL_TITLE = cn(ui.h3, "text-base");

interface InsightKindCount {
  kind: string;
  count: number;
}

interface AnalyticsChartsProps {
  teams: string[];
  colors: string[];
  byType: ReturnType<typeof countByType>;
  buckets: ReturnType<typeof activityBuckets>;
  eventCounts: number[];
  kinds: InsightKindCount[];
  advance: number[];
}

export function AnalyticsCharts({
  teams, colors, byType, buckets, eventCounts, kinds, advance,
}: AnalyticsChartsProps) {
  const toSeries = (rows: number[][]): Series[] =>
    teams.map((team, index) => ({ name: team, color: colors[index], values: rows[index] }));

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
      <section className={PANEL} aria-label="Events by type">
        <h3 className={PANEL_TITLE}>Events by type</h3>
        <Legend series={toSeries(byType.counts)} />
        <GroupedBars label="Events by type" categories={byType.types.map(cap)} series={toSeries(byType.counts)} />
      </section>

      <section className={PANEL} aria-label="Activity over time">
        <h3 className={PANEL_TITLE}>Activity per 5 minutes</h3>
        <Legend series={toSeries(buckets.counts)} />
        <LineChart label="Events per 5-minute window" labels={buckets.labels} series={toSeries(buckets.counts)} />
      </section>

      <section className={PANEL} aria-label="Share of recorded events">
        <h3 className={PANEL_TITLE}>Share of recorded events</h3>
        <Donut
          label="Share of recorded events"
          centerLabel="events"
          slices={teams.map((team, index) => ({ label: team, value: eventCounts[index], color: colors[index] }))}
        />
      </section>

      <section className={PANEL} aria-label="Insights by type">
        <h3 className={PANEL_TITLE}>Insights by type</h3>
        {kinds.length === 0 ? (
          <p className={ui.empty}>No insights yet.</p>
        ) : (
          <Donut
            label="Insights by type"
            centerLabel="insights"
            slices={kinds.map((kind, index) => ({
              label: kindLabel(kind.kind),
              value: kind.count,
              color: PALETTE[index % PALETTE.length],
            }))}
          />
        )}
      </section>

      <section className={cn(PANEL, "col-span-full")} aria-label="Territory">
        <h3 className={PANEL_TITLE}>Average advancement</h3>
        <p className={ui.empty}>0 is a team's own goal line, 100 is the opponent's.</p>
        {teams.map((team, index) => (
          <div key={team} className="grid grid-cols-[7rem_minmax(0,1fr)_3ch] items-center gap-3">
            <span className="font-semibold" style={{ color: colors[index] }}>{team}</span>
            <div
              className="h-3 overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`${team} average advancement ${advance[index]} of 100`}
            >
              <span
                className="block h-full animate-meter-in rounded-[inherit] transition-[width] duration-[600ms]"
                style={{ width: `${advance[index]}%`, background: colors[index] }}
              />
            </div>
            <span className="text-right tabular-nums">{advance[index]}</span>
          </div>
        ))}
      </section>
    </div>
  );
}