import { motion } from "framer-motion";
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
    { key: "share-1", label: "Share of actions, 1st half", values: [pct(a.before), pct(b.before)], percent: true, lowerBetter: false },
    { key: "share-2", label: "Share of actions, 2nd half", values: [pct(a.after), pct(b.after)], percent: true, lowerBetter: false },
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

// Helper to calculate the tug-of-war ratio
function calcRatio(val1: number, val2: number) {
  if (val1 === 0 && val2 === 0) return 50;
  return (val1 / (val1 + val2)) * 100;
}

function Cell({ value, percent, color, lead }: { value: number; percent: boolean; color: string; lead: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto flex h-8 min-w-[3.5rem] items-center justify-center rounded-md px-3 font-heading text-[1.1rem] font-bold tabular-nums transition-all shadow-sm",
        lead ? "text-accent-ink" : "bg-surface-2 text-fg"
      )}
      style={lead ? { background: color } : undefined}
    >
      {value}{percent ? "%" : ""}
    </div>
  );
}

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0.2 } }
};

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
    <section className={cn(ui.panel, "min-w-0 overflow-hidden")} aria-label="Team stats">
      <h3 className={ui.h3}>Head to Head</h3>
      
      {/* Header Row */}
      <div className="mb-4 flex items-center justify-between border-b border-line pb-4 pt-2">
        <h4 className="font-heading text-xl font-bold w-[35%] truncate" style={{ color: colors[0] }}>
          {a.team}
        </h4>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted border border-line">
          VS
        </span>
        <h4 className="font-heading text-xl font-bold w-[35%] truncate text-right" style={{ color: colors[1] }}>
          {b.team}
        </h4>
      </div>

      {/* Stats Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-1">
        {rows.map((r) => {
          const ratioA = calcRatio(r.values[0], r.values[1]);
          const ratioB = calcRatio(r.values[1], r.values[0]);
          
          return (
            <motion.div 
              key={r.key} 
              variants={item}
              className="group grid grid-cols-[1fr_minmax(0,1.5fr)_1fr] items-center gap-3 rounded-lg border border-transparent px-2 py-3 transition-colors hover:border-line hover:bg-surface-2/30"
            >
              <Cell value={r.values[0]} percent={r.percent} color={colors[0]} lead={leads(r, 0)} />
              
              <div className="flex flex-col items-center gap-2">
                <span className="text-center text-[0.7rem] font-bold uppercase tracking-wider text-muted transition-colors group-hover:text-fg">
                  {r.label}
                </span>
                
                {/* Tug-of-war progress bar */}
                <div className="flex h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-surface-3 shadow-inner">
                  <motion.div
                    initial={{ width: "50%" }}
                    whileInView={{ width: `${r.lowerBetter ? ratioB : ratioA}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full"
                    style={{ backgroundColor: colors[0] }}
                  />
                  <motion.div
                    initial={{ width: "50%" }}
                    whileInView={{ width: `${r.lowerBetter ? ratioA : ratioB}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full"
                    style={{ backgroundColor: colors[1] }}
                  />
                </div>
              </div>
              
              <Cell value={r.values[1]} percent={r.percent} color={colors[1]} lead={leads(r, 1)} />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-6 rounded-card bg-surface-2 p-3 border border-line">
        <p className="m-0 text-[0.75rem] leading-relaxed text-muted">
          <strong className="text-fg">Note:</strong> Every figure comes from the team reports. Possession is not a field in the feed, so the half rows show each team's share of recorded actions. The highlighted pill marks the superior performance.
        </p>
      </div>
    </section>
  );
}