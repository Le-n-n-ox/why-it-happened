import { teamColor } from "@/lib/match";
import type { PlayerStat } from "@/lib/analytics";

interface MeterCellProps {
  value: number;
  max: number;
  color: string;
}

function MeterCell({ value, max, color }: MeterCellProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="cell-meter">
      <span className="cell-meter__num">{value}</span>
      <div className="meter" aria-hidden="true"><span style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

interface PlayerRankingProps {
  players: PlayerStat[];
  teams: string[];
}

export function PlayerRanking({ players, teams }: PlayerRankingProps) {
  if (players.length === 0) {
    return (
      <section className="panel" aria-label="Player ranking">
        <h3>Player ranking</h3>
        <p className="empty">
          This match data has no player names yet, so player impact and distance can't be worked out. They
          appear automatically once events carry a player.
        </p>
      </section>
    );
  }

  const maxScore = Math.max(1, ...players.map((player) => player.score));
  const maxDistance = Math.max(1, ...players.map((player) => player.distanceM));
  return (
    <section className="panel" aria-label="Player ranking">
      <h3>Player ranking</h3>
      <p className="empty">
        Impact score is computed from the actions in the data (goals and shots count most, fouls count against).
        It is not an official rating. Distance is estimated from consecutive event locations.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Player</th><th>Team</th><th>Actions</th><th>Goals</th><th>Shots</th><th>Impact</th><th>Est. distance (m)</th></tr></thead>
          <tbody>
            {players.map((player, index) => {
              const color = teamColor(player.team, teams);
              return (
                <tr key={`${player.team}-${player.player}`}>
                  <td>{index + 1}</td><td>{player.player}</td><td style={{ color }}>{player.team}</td>
                  <td>{player.actions}</td><td>{player.goals}</td><td>{player.shots}</td>
                  <td><MeterCell value={player.score} max={maxScore} color={color} /></td>
                  <td><MeterCell value={player.distanceM} max={maxDistance} color={color} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
