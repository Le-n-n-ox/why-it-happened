import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RechartsLegend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { activityBuckets, countByType } from "@/lib/analytics";
import { kindLabel } from "@/lib/match";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

const PALETTE = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const PANEL = cn(ui.panel, "min-w-0 h-[380px] flex flex-col");
const PANEL_TITLE = cn(ui.h3, "text-base mb-4");

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
  
  // Format data for Recharts BarChart (Events by Type)
  const barData = byType.types.map((type, typeIndex) => {
    const dataPoint: Record<string, any> = { name: cap(type) };
    teams.forEach((team, teamIndex) => {
      dataPoint[team] = byType.counts[teamIndex][typeIndex];
    });
    return dataPoint;
  });

  // Format data for Recharts LineChart (Activity over time)
  const lineData = buckets.labels.map((label, labelIndex) => {
    const dataPoint: Record<string, any> = { time: label };
    teams.forEach((team, teamIndex) => {
      dataPoint[team] = buckets.counts[teamIndex][labelIndex];
    });
    return dataPoint;
  });

  // Format data for Recharts PieCharts
  const shareData = teams.map((team, index) => ({
    name: team,
    value: eventCounts[index],
    color: colors[index]
  }));

  const insightData = kinds.map((kind, index) => ({
    name: kindLabel(kind.kind),
    value: kind.count,
    color: PALETTE[index % PALETTE.length]
  }));

  // Reusable tooltip styles matching your theme
  const tooltipStyle = {
    backgroundColor: "var(--surface)",
    borderColor: "var(--border)",
    color: "var(--text)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow)"
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
      
      {/* Grouped Bars */}
      <section className={PANEL} aria-label="Events by type">
        <h3 className={PANEL_TITLE}>Events by type</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text)" }} cursor={{ fill: 'var(--surface-2)' }} />
            <RechartsLegend wrapperStyle={{ paddingTop: '10px' }} />
            {teams.map((team, index) => (
              <Bar key={team} dataKey={team} fill={colors[index]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Line Chart */}
      <section className={PANEL} aria-label="Activity over time">
        <h3 className={PANEL_TITLE}>Activity per 5 minutes</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text)" }} />
            <RechartsLegend wrapperStyle={{ paddingTop: '10px' }} />
            {teams.map((team, index) => (
              <Line 
                key={team} 
                type="monotone" 
                dataKey={team} 
                stroke={colors[index]} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, fill: colors[index], stroke: "var(--bg)", strokeWidth: 2 }} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Donut Chart: Events */}
      <section className={PANEL} aria-label="Share of recorded events">
        <h3 className={PANEL_TITLE}>Share of recorded events</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text)" }} />
            <Pie
              data={shareData}
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {shareData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" className="text-sm font-medium">
              Events
            </text>
          </PieChart>
        </ResponsiveContainer>
      </section>

      {/* Donut Chart: Insights */}
      <section className={PANEL} aria-label="Insights by type">
        <h3 className={PANEL_TITLE}>Insights by type</h3>
        {kinds.length === 0 ? (
          <p className={ui.empty}>No insights yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text)" }} />
              <Pie
                data={insightData}
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {insightData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" className="text-sm font-medium">
                Insights
              </text>
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Territory (Custom Progress Bars) */}
      <section className={cn(PANEL, "col-span-full h-auto")} aria-label="Territory">
        <h3 className={PANEL_TITLE}>Average advancement</h3>
        <p className={ui.empty}>0 is a team's own goal line, 100 is the opponent's.</p>
        <div className="mt-4 flex flex-col gap-3">
          {teams.map((team, index) => (
            <div key={team} className="grid grid-cols-[7rem_minmax(0,1fr)_3ch] items-center gap-3">
              <span className="font-semibold truncate" style={{ color: colors[index] }}>{team}</span>
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
              <span className="text-right tabular-nums text-muted">{advance[index]}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}