// web/src/components/TeamStats.tsx - two teams side by side, like a match-stats table. Every figure comes from the API.
import { useApi } from "@/hooks/useApi";
import { getTactics } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";
import type { Assessment, Tactics } from "@/types/types";

const PERCENT = /possession|share|accuracy|pct|percent/;
const LOWER_BETTER = /foul|card|offside|conceded|against/;

interface Row {
  key: string;
  label: string;
  values: [number, number];
  percent: boolean;
  lowerBetter: boolean;
}

const loadTactics = (key: string) => Promise.all(key.split("|").filter(Boolean).map((t) => getTactics(t)));
const pct = (n: number): number => Math.round(n * 100);

/** The tactics "possession" change is each team's share of recorded actions per half: not ball possession. */
function shareRows(tactics: Tactics[]): Row[] {
  const changes = tactics.map((t) => t.second_half?.changes?.find((c) => c.code === "possession"));
  const [a, b] = changes;
  if (changes.length !== 2 || !a || !b) return [];
  return [
    { key: "share-1", label: "Share of recorded actions, 1st half", values: [pct(a.before), pct(b.before)], percent: true, lowerBetter: false },
    { key: "share-2", label: "Share of recorded actions, 2nd half", values: [pct(a.after), pct(b.after)], percent: true, lowerBetter: false },
  ];
}

function metricRows(a: Assessment, b: Assessment): Row[] {
  return Object.keys(a.metrics)
    .filter((k) => typeof a.metrics[k] === "number" && typeof b.metrics[k] === "number")
    .map((k) => ({
      key: k,
      label: prettyKey(k),
      values: [a.metrics[k], b.metrics[k]] as [number, number],
      percent: PERCENT.test(k),
      lowerBetter: LOWER_BETTER.test(k),
    }));
}

function Cell({ value, percent, color, lead }: { value: number; percent: boolean; color: string; lead: boolean }) {
  return (
    <span
      className={cn("mx-auto min-w-[2.75rem] rounded-full px-2.5 py-0.5 text-center font-bold tabular-nums", lead && "text-accent-ink")}
      style={lead ? { background: color } : undefined}
    >
      {percent ? `${value}%` : value}
    </span>
  );
}

export function TeamStats({ reports }: { reports: Assessment[] }) {
  const { teams } = useMatch();
  const { data: tactics } = useApi(loadTactics, teams.join("|"));
  const [a, b] = teams.map((t) => reports.find((r) => r.team.toLowerCase() === t.toLowerCase()));
  if (!a || !b) return null;

  const rows = [...(tactics ? shareRows(tactics) : []), ...metricRows(a, b)];
  if (rows.length === 0) return null;
  const colors = [teamColor(a.team, teams), teamColor(b.team, teams)];
  const leads = (r: Row, i: 0 | 1) =>
    r.values[0] !== r.values[1] && (r.lowerBetter ? r.values[i] < r.values[1 - i] : r.values[i] > r.values[1 - i]);

  return (
    <section className={`${ui.panel} min-w-0`} aria-label="Team stats">
      <h3 className={ui.h3}>Team stats</h3>
      <div className="grid grid-cols-[1fr_minmax(0,1.4fr)_1fr] items-center gap-2 border-b border-line pb-2 text-center font-bold">
        <span style={{ color: colors[0] }}>{a.team}</span>
        <span />
        <span style={{ color: colors[1] }}>{b.team}</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_minmax(0,1.4fr)_1fr] items-center gap-2 border-b border-line py-2 text-center last:border-b-0">
          <Cell value={r.values[0]} percent={r.percent} color={colors[0]} lead={leads(r, 0)} />
          <span className="text-[.9rem]">{r.label}</span>
          <Cell value={r.values[1]} percent={r.percent} color={colors[1]} lead={leads(r, 1)} />
        </div>
      ))}
      <p className="m-0 text-xs text-muted">
        Every figure comes from the team reports. Possession is not a field in the feed, so the half rows show each
        team's share of recorded actions. The highlight marks the better figure.
      </p>
    </section>
  );
}