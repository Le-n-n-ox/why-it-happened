import { formatRating, prettyKey } from "@/lib/players";
import { teamColor } from "@/lib/match";
import type { PlayerSummary } from "@/types/types";

interface PlayerCardProps {
  player: PlayerSummary;
  rank: number;
  scaleMax: number;
  teams: string[];
}

export function PlayerCard({ player, rank, scaleMax, teams }: PlayerCardProps) {
  const color = teamColor(player.team, teams);
  const pct = player.rating === null ? 0 : Math.max(0, Math.min(100, (player.rating / scaleMax) * 100));

  return (
    <li className="pcard" style={{ borderLeftColor: color }}>
      <span className="pcard__rank" aria-hidden="true">{rank}</span>
      <div className="pcard__main">
        <a className="pcard__name" href={`#/player/${encodeURIComponent(player.id)}`}>{player.name}</a>
        <div className="card__meta">
          <span className="card__team" style={{ color }}>{player.team}</span>
        </div>
        <div className="card__chips">
          {player.stats.slice(0, 4).map((stat) => (
            <span key={stat.key} className="chip">{prettyKey(stat.key)}: {stat.value}</span>
          ))}
        </div>
      </div>
      <div className="pcard__rating">
        <span className="rating" aria-label={`Rating ${formatRating(player.rating)}`}>
          {formatRating(player.rating)}
        </span>
        <div className="rating-bar" aria-hidden="true">
          <span style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </li>
  );
}
