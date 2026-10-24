import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { teamColor } from "@/lib/match";
import { formatRating, ratingPct } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { PlayerSummary } from "@/types/types";

interface PlayerCardProps {
  player: PlayerSummary;
  rank: number;
  teams: string[];
  onCompare?: (id: string) => void;
  comparing?: boolean;
}

export function PlayerCard({ player, rank, teams, onCompare, comparing = false }: PlayerCardProps) {
  const color = teamColor(player.team, teams);
  const pct = ratingPct(player.rating);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-surface-3 hover:shadow-card sm:grid sm:grid-cols-[auto_minmax(0,1fr)_minmax(140px,auto)] sm:items-center sm:gap-5"
    >
      {/* Team Color Accent Ribbon */}
      <div className="absolute bottom-0 left-0 top-0 w-1.5" style={{ backgroundColor: color }} />

      {/* Rank Badge */}
      <div className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 font-heading text-lg font-bold text-muted transition-colors group-hover:text-fg sm:ml-1">
        {rank}
      </div>

      {/* Main Info & Chips */}
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <a
            className="text-lg font-bold text-fg transition-colors hover:text-accent focus-visible:outline-accent"
            href={`#/player/${encodeURIComponent(player.id)}`}
          >
            {player.name}
          </a>
          <span className="text-sm font-bold tracking-wide" style={{ color }}>
            {player.team}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(ui.chip, "bg-surface-2")}>{player.goals} goals</span>
          <span className={cn(ui.chip, "bg-surface-2")}>{player.shots} shots</span>
          <span className={cn(ui.chip, "bg-surface-2")}>{player.passes} passes</span>
          <span className={cn(ui.chip, "bg-surface-2")}>{player.touches} touches</span>
          {typeof player.distance_m === "number" && player.distance_m > 0 && (
            <span className={cn(ui.chip, "bg-surface-2")}>{(player.distance_m / 1000).toFixed(1)} km</span>
          )}
          {typeof player.top_speed_kph === "number" && player.top_speed_kph > 0 && (
            <span className={cn(ui.chip, "bg-surface-2")}>{player.top_speed_kph.toFixed(1)} km/h</span>
          )}
          {typeof player.pass_accuracy === "number" && player.passes > 0 && (
            <span className={cn(ui.chip, "bg-surface-2")}>{Math.round(player.pass_accuracy)}% passes</span>
          )}
        </div>

        {onCompare && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button 
              aria-pressed={comparing} 
              onClick={() => onCompare(player.id)}
              className={comparing ? "bg-surface-3 text-fg border-line" : ""}
            >
              {comparing ? "In comparison" : "Compare"}
            </Button>
            {comparing && <span className={ui.quiet}>Vs second player</span>}
          </div>
        )}
      </div>

      {/* Rating Display */}
      <div className="mt-2 flex w-full flex-col justify-end gap-1.5 sm:mt-0 sm:w-auto">
        <div className="flex items-baseline justify-between sm:justify-end sm:gap-2">
          <span className="text-sm font-medium text-muted sm:hidden">Match Rating</span>
          <span
            className="font-heading text-3xl font-bold tabular-nums"
            aria-label={`Rating ${formatRating(player.rating)}`}
            style={{ color: pct > 75 ? color : "inherit" }}
          >
            {formatRating(player.rating)}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    </motion.li>
  );
}