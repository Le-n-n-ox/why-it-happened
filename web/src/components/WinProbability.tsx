// web/src/components/WinProbability.tsx - win, draw and loss probabilities over the match.
// During the match it is drawn from `event: prediction`. At full time it uses /predict's timeline too.
import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { Legend } from "@/components/charts";
import { Loader } from "@/components/Loader";
import { ValidationNote } from "@/components/ValidationNote";
import { useApi } from "@/hooks/useApi";
import { getPredict } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";
import type { Prediction } from "@/types/types";

interface Point {
  minute: number;
  probs: Record<string, number>;
}
interface Goal {
  minute: number;
  team: string;
}

const W = 520;
const H = 260;
const ML = 38;
const MR = 12;
const MT = 14;
const MB = 30;
const PLOT_W = W - ML - MR;
const PLOT_H = H - MT - MB;
const GRID = [0, 25, 50, 75, 100];

const label = (name: string): string => (name === "draw" ? "Draw" : name);

function Chart({
  points, names, teams, maxX, goals,
}: { points: Point[]; names: string[]; teams: string[]; maxX: number; goals: Goal[] }) {
  const x = (m: number) => ML + (Math.min(Math.max(m, 0), maxX) / maxX) * PLOT_W;
  const y = (pct: number) => MT + PLOT_H - (Math.min(100, Math.max(0, pct)) / 100) * PLOT_H;
  const colorOf = (name: string) => (name === "draw" ? "var(--muted)" : teamColor(name, teams));
  const xTicks = Array.from({ length: 7 }, (_, i) => (maxX * i) / 6);
  const last = points[points.length - 1];
  const latest = last ? names.map((n) => `${label(n)} ${last.probs[n] ?? 0}%`).join(", ") : "";

  return (
    <svg className="block h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Win probability over the match. Latest: ${latest}`}>
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
      {names.map((name) => {
        const pts = points.filter((p) => p.probs[name] !== undefined);
        if (pts.length === 0) return null;
        const d = `M${pts.map((p) => `${x(p.minute).toFixed(1)},${y(p.probs[name]).toFixed(1)}`).join(" L")}`;
        const draw = name === "draw";
        return (
          <g key={name}>
            <path
              d={d}
              pathLength={1}
              style={{ stroke: colorOf(name) }}
              className={cn(
                "fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.4]",
                draw ? "[stroke-dasharray:.03_.02]" : "animate-draw [stroke-dasharray:1]",
              )}
            />
            {pts.map((p) => (
              <circle key={p.minute} cx={x(p.minute)} cy={y(p.probs[name])} r="2.5" style={{ fill: colorOf(name) }}>
                <title>{`${label(name)} ${p.probs[name]}% at ${Math.floor(p.minute)}'`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {goals
        .filter((g) => g.minute <= maxX)
        .map((g, i) => (
          <circle key={`${i}-${g.minute}`} cx={x(g.minute)} cy={MT + PLOT_H} r="3.5"
            className="stroke-surface [stroke-width:1.5]" style={{ fill: teamColor(g.team, teams) }}>
            <title>{`Goal ${Math.floor(g.minute)}' ${g.team}`}</title>
          </circle>
        ))}
    </svg>
  );
}

function ProbabilityView({
  points, summary, maxX, goals = [], note,
}: { points: Point[]; summary: Prediction | null; maxX: number; goals?: Goal[]; note?: string }) {
  const { teams: matchTeams } = useMatch();
  const teams = summary?.teams ?? matchTeams.slice(0, 2);
  const names = [...teams, "draw"];
  const probs = summary?.probabilities;
  const reasons = summary?.reasons ?? [];

  return (
    <>
      <Legend series={names.map((n) => ({ name: label(n), color: n === "draw" ? "var(--muted)" : teamColor(n, matchTeams) }))} />
      <Chart points={points} names={names} teams={matchTeams} maxX={maxX} goals={goals} />

      {summary && probs && (
        <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {summary.favourite && (
            <span className="font-semibold">
              {summary.minutes_left === 0 ? "Final" : "Favourite"}: {summary.favourite}
            </span>
          )}
          <span className="text-muted">{names.map((n) => `${label(n)} ${probs[n] ?? 0}%`).join(" · ")}</span>
        </p>
      )}
      {reasons.length > 0 && (
        <ul className="grid list-disc gap-1 pl-5 text-[.95rem]">
          {reasons.map((r, i) => <li key={`${i}-${r}`}>{r}</li>)}
        </ul>
      )}
      {summary?.method && <p className="m-0 text-xs text-muted">Method: {summary.method}</p>}
      {note && <p className="m-0 text-xs text-muted">{note}</p>}
    </>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <section className={ui.panel} aria-label="Win probability">
      <h3 className={ui.h3}>Win probability</h3>
      {children}
      <ValidationNote />
    </section>
  );
}

/** During the match: only what the stream has sent so far, so nothing is given away. */
function LiveProbability() {
  const { predictions, match } = useMatch();
  const last = predictions.length > 0 ? predictions[predictions.length - 1] : null;
  const points = predictions.map((p) => ({ minute: p.minute ?? 0, probs: p.probabilities ?? {} }));
  const maxX = Math.max(match?.duration_min ?? 0, last?.minute ?? 0, 5);

  return (
    <Frame>
      {last === null ? (
        <p className={ui.empty}>The win probability appears after the first shot or goal, once both teams have played.</p>
      ) : (
        <ProbabilityView points={points} summary={last} maxX={maxX} />
      )}
    </Frame>
  );
}

/** At full time: /predict's timeline (every 5 minutes), extended by the prediction events. */
function FullProbability({ goals }: { goals?: Goal[] }) {
  const { predictions, match } = useMatch();
  const { data, loading, error, retry } = useApi(getPredict, "now");

  const merged = new Map<number, Point>();
  (data?.timeline ?? []).forEach((t: any) =>
     merged.set(t.minute, { minute: t.minute, probs: t.probabilities }));
  predictions.forEach((p) => merged.set(p.minute ?? 0, { minute: p.minute ?? 0, probs: p.probabilities ?? {} }));
  const points = [...merged.values()].sort((a, b) => a.minute - b.minute);
  const maxX = Math.max(match?.duration_min ?? 0, points.length > 0 ? points[points.length - 1].minute : 0, 5);

  return (
    <Frame>
      {loading && <Loader label="Loading win probability" />}
      {error !== null && (
        <p className={ui.empty}>
          Couldn't load the win probability. <Button onClick={retry}>Retry</Button>
        </p>
      )}
      {data && !data.available && data.reason && <p className={ui.empty}>{data.reason}</p>}
      {data && data.available && (
        <ProbabilityView
          points={points}
          summary={data}
          maxX={maxX}
          goals={goals}
          note={
            points[0]?.minute === 0
              ? "The line starts level at minute 0: that is a starting assumption, not a prediction of the match."
              : undefined
          }
        />
      )}
    </Frame>
  );
}

/** `goals` (minute and team of each goal, from /why) adds dots along the bottom at full time. */
export function WinProbability({ goals }: { goals?: Goal[] }) {
  const { ended } = useMatch();
  return ended ? <FullProbability goals={goals} /> : <LiveProbability />;
}