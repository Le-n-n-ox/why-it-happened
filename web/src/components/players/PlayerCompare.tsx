import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { Heatmap } from "@/components/Heatmap";
import { Loader } from "@/components/Loader";
import { RatingReceipt } from "@/components/RatingReceipt";
import { useApi } from "@/hooks/useApi";
import { getPlayer, getPlayers } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { formatRating, STAT_LABELS, type StatKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { MatchEvent, PlayerDetail } from "@/types/types";

const COUNTS: StatKey[] = [
  "touches", "passes", "carries", "shots", "goals", "tackles", "interceptions", "fouls",
  "progressive", "key_moments", "chains_involved",
];

interface ColumnProps {
  player: PlayerDetail;
  teams: string[];
  events: MatchEvent[];
  delay?: number;
}

/** One player: the rating and its breakdown, the main counts, and where their events happened. */
function CompareColumn({ player, teams, events, delay = 0 }: ColumnProps) {
  const color = teamColor(player.team, teams);
  const mine = events.filter((e) => e.team === player.team && e.player === player.name);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay, type: "spring", bounce: 0.2 }}
      className="grid min-w-0 content-start gap-4 rounded-card border border-line bg-surface p-5 shadow-sm hover:border-surface-3 hover:shadow-card transition-all relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: color }} />
      
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3 pt-1">
        <div className="flex flex-col">
          <span className="font-heading text-xl font-bold">{player.name}</span>
          <span className="text-sm font-bold tracking-wide" style={{ color }}>{player.team}</span>
        </div>
        <span 
          className="font-heading text-4xl font-bold tabular-nums" 
          aria-label={`Rating ${formatRating(player.rating)}`}
        >
          {formatRating(player.rating)}
        </span>
      </div>

      <div className="rounded-md bg-surface-2 p-3">
        <RatingReceipt lines={player.rating_breakdown} rating={player.rating} />
      </div>

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))]">
        {COUNTS.map((k) => (
          <div key={k} className="flex flex-col justify-center rounded-card bg-surface-2 px-3 py-2 text-center transition-colors hover:bg-surface-3">
            <dt className="text-[0.65rem] font-medium tracking-wider text-muted uppercase leading-tight mb-1">{STAT_LABELS[k]}</dt>
            <dd className="m-0 font-heading text-lg font-bold tabular-nums text-fg">{player[k]}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 rounded-card border border-line bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-fg">Activity Map</span>
          <span className="text-xs font-medium text-muted">{mine.length} recorded events</span>
        </div>
        <div className="relative w-full overflow-hidden rounded-md border border-line bg-surface">
          <Heatmap events={mine} teams={teams} color={color} />
        </div>
      </div>
    </motion.div>
  );
}

interface Props {
  current: PlayerDetail;
  opponentId: string;
  teams: string[];
  events: MatchEvent[];
  onPick: (id: string) => void;
  onClear: () => void;
}

/** The compare panel: the player whose page this is, and the one chosen with ?vs=. */
export function PlayerCompare({ current, opponentId, teams, events, onPick, onClear }: Props) {
  const { data: opponent, loading, error, notFound } = useApi(getPlayer, opponentId);
  const roster = useApi(getPlayers, "all");
  const options = (roster.data ?? []).filter((p) => p.id !== current.id);
  const missing = opponent !== null && !options.some((p) => p.id === opponent.id);

  return (
    <section className={cn(ui.panel, "overflow-hidden")} aria-label="Compare two players">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <h3 className={ui.h3}>Player Comparison</h3>
        <div className="flex flex-wrap items-center gap-3 rounded-full bg-surface-2 px-4 py-1.5 border border-line">
          <label htmlFor="compare-opponent" className="text-sm font-medium text-muted">
            Vs:
          </label>
          <select
            id="compare-opponent"
            value={opponentId}
            onChange={(e) => onPick(e.target.value)}
            className="bg-transparent border-none py-1 text-sm font-bold focus:ring-0 focus:outline-none w-40 truncate"
          >
            {missing && opponent && <option value={opponent.id}>{opponent.name}</option>}
            {options.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="h-4 w-px bg-line mx-1" />
          <Button 
            variant="ghost" 
            onClick={onClear} 
            className="h-auto p-1 text-xs uppercase tracking-wider text-muted hover:text-accent-2"
          >
            Clear
          </Button>
        </div>
      </div>

      <p className={cn(ui.empty, "mt-2 mb-4 max-w-2xl")}>
        Statistical breakdown strictly derived from the backend event feed. Event heatmaps trace all recorded physical actions.
      </p>

      {loading && <div className="py-8"><Loader label="Loading comparison metrics..." /></div>}
      
      {error !== null && notFound && (
        <p className={ui.empty}>That player is not in this match data.</p>
      )}
      
      {error !== null && !notFound && (
        <p role="alert" className={ui.banner}>Couldn't load the other player ({error}).</p>
      )}

      <AnimatePresence mode="popLayout">
        {opponent && (
          <motion.div 
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-6 mt-4"
            layout
          >
            <CompareColumn player={current} teams={teams} events={events} delay={0} />
            <CompareColumn player={opponent} teams={teams} events={events} delay={0.15} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}