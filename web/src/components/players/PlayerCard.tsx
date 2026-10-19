import { teamColor } from "@/lib/match";
import { formatRating, ratingPct } from "@/lib/players";
import { ui } from "@/lib/ui";
import type { PlayerSummary } from "@/types/types";

interface PlayerCardProps {
  player: PlayerSummary;
  rank: number;
  teams: string[];
}

export function PlayerCard({ player, rank, teams }: PlayerCardProps) {
  const color = teamColor(player.team, teams);
  const pct = ratingPct(player.rating);

  return (
    <li
      className="grid grid-cols-[2.4rem_minmax(0,1fr)_minmax(120px,180px)] items-center gap-3 rounded-card border border-l-4 border-line bg-surface px-3.5 py-3 transition hover:-translate-y-px hover:shadow-card max-[600px]:grid-cols-[2rem_minmax(0,1fr)]"
      style={{ borderLeftColor: color }}
    >
      <span className="text-center font-heading text-[1.4rem] text-muted" aria-hidden="true">{rank}</span>
      <div className="grid min-w-0 gap-1.5">
        <a
          className="text-[1.1rem] font-bold text-accent hover:underline"
          href={`#/player/${encodeURIComponent(player.id)}`}
        >
          {player.name}
        </a>
        <div className={ui.meta}>
          <span className="font-bold" style={{ color }}>{player.team}</span>
        </div>

        <div className={ui.chips}>
          <span className={ui.chip}>{player.goals} goals</span>
          <span className={ui.chip}>{player.shots} shots</span>
          <span className={ui.chip}>{player.passes} passes</span>
          <span className={ui.chip}>{player.touches} touches</span>
        </div>

      </div>
      <div className="grid justify-items-end gap-1.5 max-[600px]:col-span-full max-[600px]:justify-items-stretch">
        <span
          className="font-heading text-[1.8rem] font-bold tabular-nums"
          aria-label={`Rating ${formatRating(player.rating)}`}
        >
          {formatRating(player.rating)}
        </span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <span
            className="block h-full animate-meter-in rounded-[inherit] transition-[width] duration-[600ms]"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </li>
  );
}
