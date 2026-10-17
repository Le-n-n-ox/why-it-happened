import { AnimatedNumber } from "@/components/AnimatedNumber";

interface StatCardProps {
  title: string;
  teams: string[];
  colors: string[];
  values: number[];
}

function StatCard({ title, teams, colors, values }: StatCardProps) {
  return (
    <div className="stat">
      <h3 className="stat__title">{title}</h3>
      {teams.map((team, index) => (
        <div key={team} className="stat__row">
          <span style={{ color: colors[index] }}>{team}</span>
          <span className="stat__num"><AnimatedNumber value={values[index]} /></span>
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
    <div className="stats">
      <StatCard title="Goals" teams={teams} colors={colors} values={values.goals} />
      <StatCard title="Shots" teams={teams} colors={colors} values={values.shots} />
      <StatCard title="Passes" teams={teams} colors={colors} values={values.passes} />
      <StatCard title="Insights found" teams={teams} colors={colors} values={values.insights} />
      <StatCard title="Ball travel (m, est.)" teams={teams} colors={colors} values={values.travel} />
    </div>
  );
}
