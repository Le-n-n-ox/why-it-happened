import { AnimatedNumber } from "@/components/AnimatedNumber";

interface StatCardProps {
  title: string;
  teams: string[];
  colors: string[];
  values: number[];
}

function StatCard({ title, teams, colors, values }: StatCardProps) {
  return (
    <div className="grid gap-1 rounded-card border border-line bg-surface px-4 py-3.5">
      <h3 className="m-0 text-xs font-normal uppercase tracking-wider text-muted">{title}</h3>
      {teams.map((team, index) => (
        <div key={team} className="flex items-baseline justify-between font-semibold">
          <span style={{ color: colors[index] }}>{team}</span>
          <span className="font-heading text-[1.9rem] tabular-nums text-fg">
            <AnimatedNumber value={values[index]} />
          </span>
        </div>
      ))}
    </div>
  );
}

interface AnalyticsStatsProps {
  teams: string[];
  colors: string[];
  values: {
    goals: number[];
    shots: number[];
    passes: number[];
    insights: number[];
    travel: number[];
  };
}

export function AnalyticsStats({ teams, colors, values }: AnalyticsStatsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <StatCard title="Goals" teams={teams} colors={colors} values={values.goals} />
      <StatCard title="Shots" teams={teams} colors={colors} values={values.shots} />
      <StatCard title="Passes" teams={teams} colors={colors} values={values.passes} />
      <StatCard title="Insights found" teams={teams} colors={colors} values={values.insights} />
      <StatCard title="Ball travel (m, est.)" teams={teams} colors={colors} values={values.travel} />
    </div>
  );
}