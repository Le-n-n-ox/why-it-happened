// web/src/components/WinProbability.tsx - win probability over the match, from /predict's timeline.
import { Button } from "@/components/Button";
import { Legend } from "@/components/charts";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getPredict } from "@/lib/api";
import { readPredict, type PredictView } from "@/lib/extras";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";

const W = 520;
const H = 260;
const ML = 38;
const MR = 12;
const MT = 14;
const MB = 30;
const PLOT_W = W - ML - MR;
const PLOT_H = H - MT - MB;
const GRID = [0, 25, 50, 75, 100];

interface Goal {
  minute: number;
  team: string;
}

function Chart({ view, teams, goals }: { view: PredictView; teams: string[]; goals: Goal[] }) {
  const span = view.maxMinute - view.minMinute || 1;
  const x = (m: number) => ML + ((m - view.minMinute) / span) * PLOT_W;
  const y = (pct: number) => MT + PLOT_H - (Math.min(100, Math.max(0, pct)) / 100) * PLOT_H;
  const colorOf = (name: string, draw: boolean) => (draw ? "var(--muted)" : teamColor(name, teams));
  const xTicks = Array.from({ length: 6 }, (_, i) => view.minMinute + (span * i) / 5);
  const summary = view.series
    .map((s) => `${s.name} ends at ${Math.round(s.points[s.points.length - 1].pct)}%`)
    .join(", ");

  return (
    <svg className="block h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Win probability. ${summary}`}>
      {GRID.map((g) => (
        <g key={g}>
          <line className="stroke-line [stroke-width:1]" x1={ML} x2={W - MR} y1={y(g)} y2={y(g)} />
          <text className="fill-muted text-[10px]" x={ML - 6} y={y(g)} dy=".32em" textAnchor="end">{g}%</text>
        </g>
      ))}
      {xTicks.map((m) => (
        <text key={m} className="fill-muted text-[10px]" x={x(m)} y={H - 10} textAnchor="middle">
          {Math.floor(m)}'
        </text>
      ))}
      {view.series.map((s) => {
        const d = `M${s.points.map((p) => `${x(p.minute).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" L")}`;
        return (
          <path
            key={s.name}
            d={d}
            pathLength={1}
            style={{ stroke: colorOf(s.name, s.draw) }}
            className={cn(
              "fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.4]",
              s.draw ? "[stroke-dasharray:.03_.02]" : "animate-draw [stroke-dasharray:1]",
            )}
          />
        );
      })}
      {goals
        .filter((g) => g.minute >= view.minMinute && g.minute <= view.maxMinute)
        .map((g, i) => (
          <circle key={`${i}-${g.minute}`} cx={x(g.minute)} cy={MT + PLOT_H} r="3.5"
            className="stroke-surface [stroke-width:1.5]" style={{ fill: teamColor(g.team, teams) }}>
            <title>{`Goal ${Math.floor(g.minute)}' ${g.team}`}</title>
          </circle>
        ))}
    </svg>
  );
}

/** `goals` (minute and team of each goal, from /why) adds markers along the bottom. */
export function WinProbability({ goals = [] }: { goals?: Goal[] }) {
  const { teams } = useMatch();
  const { data, loading, error, notFound, retry } = useApi(getPredict, "now");
  const view = data === null ? null : readPredict(data, teams);
  const latest = view ? view.series.map((s) => ({ ...s, now: s.points[s.points.length - 1].pct })) : [];

  return (
    <section className={ui.panel} aria-label="Win probability">
      <h3 className={ui.h3}>Win probability</h3>
      {loading && <Loader label="Loading win probability" />}
      {notFound && <p className={ui.empty}>No win-probability timeline for this match.</p>}
      {error !== null && !notFound && (
        <p className={ui.empty}>
          Couldn't load the win probability. <Button onClick={retry}>Retry</Button>
        </p>
      )}
      {!loading && error === null && data !== null && view === null && (
        <p className={ui.empty}>No win-probability timeline to show.</p>
      )}
      {view && (
        <>
          <Legend series={view.series.map((s) => ({ name: s.name, color: s.draw ? "var(--muted)" : teamColor(s.name, teams) }))} />
          <Chart view={view} teams={teams} goals={goals} />
          <p className="m-0 text-[.9rem] text-muted">
            At the end of the timeline:{" "}
            {latest.map((s) => `${s.name} ${Math.round(s.now)}%`).join(" · ")}. Dots mark the goals.
          </p>
        </>
      )}
    </section>
  );
}