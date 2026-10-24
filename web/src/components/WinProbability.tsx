import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
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

const label = (name: string): string => (name === "draw" ? "Draw" : name);

// Recharts custom tooltip
const CustomTooltip = ({ active, payload, label: minuteLabel }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[140px] rounded-card border border-line bg-surface/95 p-3 shadow-card backdrop-blur-sm">
        <p className="mb-2 border-b border-line pb-1 text-[0.8rem] font-bold text-muted">
          Minute {minuteLabel}'
        </p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold" style={{ color: entry.color }}>
                {label(entry.name)}
              </span>
              <span className="font-bold tabular-nums text-fg">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function Chart({
  points, names, teams, maxX, goals,
}: { points: Point[]; names: string[]; teams: string[]; maxX: number; goals: Goal[] }) {
  
  // Flatten data for Recharts
  const data = points.map((p) => ({
    minute: p.minute,
    ...p.probs,
  }));

  const colorOf = (name: string) => (name === "draw" ? "var(--muted)" : teamColor(name, teams));

  return (
    <div className="mt-6 h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          
          <XAxis 
            dataKey="minute" 
            type="number" 
            domain={[0, maxX]} 
            stroke="var(--muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(tick) => `${tick}'`} 
          />
          
          <YAxis 
            domain={[0, 100]} 
            stroke="var(--muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(tick) => `${tick}%`} 
          />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: "var(--surface-3)", strokeWidth: 2, strokeDasharray: "4 4" }} 
          />
          
          {names.map((name) => {
            const isDraw = name === "draw";
            return (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colorOf(name)}
                strokeWidth={isDraw ? 2 : 3}
                strokeDasharray={isDraw ? "4 4" : undefined}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: colorOf(name) }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            );
          })}

          {/* Goal markers on the baseline */}
          {goals
            .filter((g) => g.minute <= maxX)
            .map((g, i) => (
              <ReferenceDot
                key={`goal-${i}-${g.minute}`}
                x={g.minute}
                y={0}
                r={4.5}
                fill={teamColor(g.team, teams)}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: "spring" as const, bounce: 0 } }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Legend 
        series={names.map((n) => ({ 
          name: label(n), 
          color: n === "draw" ? "var(--muted)" : teamColor(n, matchTeams) 
        }))} 
      />
      
      <Chart points={points} names={names} teams={matchTeams} maxX={maxX} goals={goals} />

      <div className="mt-6 flex flex-col gap-4 rounded-card border border-line bg-surface-2 p-4">
        {summary && probs && (
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-3">
            {summary.favourite && (
              <span className="font-heading text-lg font-bold text-fg">
                <span className="text-muted text-sm font-semibold uppercase tracking-wider mr-2">
                  {summary.minutes_left === 0 ? "Final Verdict" : "Current Favourite"}
                </span>
                {summary.favourite}
              </span>
            )}
            <div className="flex flex-wrap gap-3">
              {names.map((n) => (
                <span key={n} className="rounded-full bg-surface px-3 py-1 text-sm font-bold shadow-sm border border-line">
                  <span style={{ color: n === "draw" ? "var(--muted)" : teamColor(n, matchTeams) }}>
                    {label(n)}
                  </span>
                  <span className="ml-1 text-fg tabular-nums">{probs[n] ?? 0}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
        
        {reasons.length > 0 && (
          <motion.ul variants={containerVariants} initial="hidden" animate="show" className="grid gap-2 text-[0.95rem] text-fg/90">
            {reasons.map((r, i) => (
              <motion.li key={`${i}-${r}`} variants={itemVariants} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent/60" aria-hidden="true" />
                <span>{r}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
        
        <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
          {summary?.method && <p className="m-0">Model: {summary.method}</p>}
          {note && <p className="m-0 italic">{note}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <section className={cn(ui.panel, "overflow-hidden")} aria-label="Win probability">
      <h3 className={ui.h3}>Win Probability</h3>
      {children}
      <div className="mt-6">
        <ValidationNote />
      </div>
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
        <div className="flex h-32 items-center justify-center rounded-card border border-dashed border-line bg-surface-2 p-6 text-center text-muted">
          <p className="m-0 max-w-sm">The win probability model initializes after the first major event, once both teams have established their opening tactics.</p>
        </div>
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
      {loading && <div className="py-8"><Loader label="Loading win probability matrix..." /></div>}
      
      {error !== null && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface-2 p-6">
          <p className="m-0 text-muted">Couldn't load the win probability data.</p>
          <Button onClick={retry}>Retry Connection</Button>
        </div>
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
              ? "The line starts level at minute 0: this represents the neutral baseline assumption before the ball is kicked, rather than a definitive prediction."
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