import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { PlayerStat } from "@/lib/analytics";

interface MeterCellProps {
  value: number;
  max: number;
  color: string;
}

const TH = "border-b border-line px-2.5 py-1.5 text-left font-semibold text-muted";
const TD = "border-b border-line px-2.5 py-1.5 text-left";

function MeterCell({ value, max, color }: MeterCellProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex min-w-[130px] items-center gap-2">
      <span className="min-w-[3.5ch] text-right tabular-nums">{value}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <span
          className="block h-full animate-meter-in rounded-[inherit] transition-[width] duration-[600ms]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
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
      <section className={ui.panel} aria-label="Player ranking">
        <h3 className={ui.h3}>Player ranking</h3>
        <p className={ui.empty}>
          This match data has no player names yet, so player impact and distance can't be worked out. They
          appear automatically once events carry a player.
        </p>
      </section>
    );
  }

  const maxScore = Math.max(1, ...players.map((player) => player.score));
  const maxDistance = Math.max(1, ...players.map((player) => player.distanceM));
  return (
    <section className={ui.panel} aria-label="Player ranking">
      <h3 className={ui.h3}>Player ranking</h3>
      <p className={ui.empty}>
        Impact score is computed from the actions in the data (goals and shots count most, fouls count against).
        It is not an official rating. Distance is estimated from consecutive event locations.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[.85rem]">
          <thead>
            <tr>
              <th className={TH}>#</th>
              <th className={TH}>Player</th>
              <th className={TH}>Team</th>
              <th className={TH}>Actions</th>
              <th className={TH}>Goals</th>
              <th className={TH}>Shots</th>
              <th className={TH}>Impact</th>
              <th className={TH}>Est. distance (m)</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const color = teamColor(player.team, teams);
              return (
                <tr key={`${player.team}-${player.player}`}>
                  <td className={TD}>{index + 1}</td>
                  <td className={TD}>{player.player}</td>
                  <td className={TD} style={{ color }}>{player.team}</td>
                  <td className={TD}>{player.actions}</td>
                  <td className={TD}>{player.goals}</td>
                  <td className={TD}>{player.shots}</td>
                  <td className={TD}><MeterCell value={player.score} max={maxScore} color={color} /></td>
                  <td className={TD}><MeterCell value={player.distanceM} max={maxDistance} color={color} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}