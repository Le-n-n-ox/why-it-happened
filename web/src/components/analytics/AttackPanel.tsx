// web/src/components/analytics/AttackPanel.tsx - where each team attacks from, on the pitch map.
import { PitchBackground } from "@/components/PitchBackground";
import { CHANNEL_NAMES, type AttackRow, type ZoneCell } from "@/lib/analytics";
import { PITCH_H, PITCH_W } from "@/lib/match";
import { ui } from "@/lib/ui";
import type { MatchEvent } from "@/types/types";

interface AttackPanelProps {
  events: MatchEvent[];
  teams: string[];
  colors: string[];
  rows: AttackRow[];
  leader: string | null;
  cells: ZoneCell[];
}

// Passes, carries and shots: the actions that move the ball forward.
const ATTACK_TYPES = new Set(["pass", "carry", "shot", "goal"]);

/** How many attacking actions each team made in the whole match. */
function attackingActions(events: MatchEvent[], teams: string[]): number[] {
  return teams.map((team) => events.filter((e) => e.team === team && ATTACK_TYPES.has(e.type)).length);
}

export function AttackPanel({ events, teams, colors, rows, leader, cells }: AttackPanelProps) {
  const totals = attackingActions(events, teams);
  const noAttacks = rows.every((row) => row.total === 0);
  const peak = Math.max(1, ...cells.map((c) => c.count));

  return (
    <section className={ui.panel} aria-label="Where each team attacks">
      <h3 className={ui.h3}>Where each team attacks</h3>
      <p className={ui.empty}>
        The shaded blocks are each team's final third, split into the top, centre and bottom of the
        pitch map. Darker means more of their passes, carries and shots went through there. Counted in
        the browser from the event list in /events.
      </p>

      <svg
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        role="img"
        aria-label="Pitch map of where each team's attacking actions happened"
        className="h-auto w-full rounded-card shadow-card [--accent:#00ff85] [--accent-2:#ff2d87] [--bg:#12031a] [--text:#f4eefa]"
      >
        <PitchBackground teams={teams}>
          {cells.map((cell) => {
            const color = colors[teams.indexOf(cell.team)] ?? "var(--muted)";
            return (
              <g key={`${cell.team}-${cell.channel}`}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  fill={color}
                  opacity={0.08 + 0.62 * (cell.count / peak)}
                  className="stroke-white/30 [stroke-width:.2]"
                >
                  <title>{`${cell.team}: ${cell.count} final-third actions through the ${CHANNEL_NAMES[cell.channel]}`}</title>
                </rect>
                <text
                  x={cell.x + cell.w / 2}
                  y={cell.y + cell.h / 2}
                  dy=".35em"
                  textAnchor="middle"
                  className="pointer-events-none fill-bg text-[3px] font-bold"
                >
                  {cell.count}
                </text>
              </g>
            );
          })}
        </PitchBackground>
      </svg>

      <div className="grid gap-2.5">
        {rows.map((row, index) => {
          const total = totals[index] ?? 0;
          const mine = cells.filter((c) => c.team === row.team);
          return (
            <div key={row.team} className="grid gap-1">
              <p className="m-0 flex flex-wrap items-baseline gap-2 text-[.9rem]">
                <strong style={{ color: colors[index] }}>{row.team}</strong>
                <span className="text-muted">
                  {row.total} of {total} attacking actions reached the final third
                  {total > 0 ? ` (${Math.round((row.total / total) * 100)}%)` : ""}
                </span>
              </p>
              <ul className="m-0 grid list-none gap-1 p-0">
                {mine.map((cell) => (
                  <li key={cell.channel} className="flex items-center gap-2 text-[.85rem]">
                    <span className="w-24 shrink-0 text-muted">the {CHANNEL_NAMES[cell.channel]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <span
                        className="block h-full rounded-[inherit]"
                        style={{
                          width: `${row.total > 0 ? Math.round((cell.count / row.total) * 100) : 0}%`,
                          background: colors[index],
                        }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums">
                      {cell.count} ({row.total > 0 ? Math.round((cell.count / row.total) * 100) : 0}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="m-0 font-bold">
        {noAttacks ? "No attacking actions in the final third yet."
          : leader ? `${leader} attack the most.` : "Both teams have attacked equally so far."}
      </p>
    </section>
  );
}
