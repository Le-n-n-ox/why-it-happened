// web/src/components/PositionsPitch.tsx - where each player was LAST SEEN, drawn on the pitch.
import { PitchBackground } from "@/components/PitchBackground";
import { PITCH_H, PITCH_W, teamColor, toPitch } from "@/lib/match";
import { dotOpacity } from "@/lib/positions";
import type { PositionsResponse } from "@/types/types";

interface Props {
  data: PositionsResponse;
  teams: string[];
}

/**
 * The dots are last-seen places, not live tracking: a stale dot is drawn faint, and the
 * average place of a player is a hollow ring so it never reads as a position.
 */
export function PositionsPitch({ data, teams }: Props) {
  const firstTeam = teams[0] ?? data.players[0]?.team ?? "";
  const place = (team: string, x: number, y: number) => toPitch({ team, x, y }, firstTeam);
  const ballAt = data.ball ? place(data.ball.team, data.ball.x, data.ball.y) : null;
  const label = `Pitch map: ${data.players.length} players last seen by minute ${Math.floor(data.minute)}`;

  return (
    <svg
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      role="img"
      aria-label={label}
      // The pitch keeps its own colours in both themes.
      className="h-auto w-full rounded-card shadow-card [--accent:#00ff85] [--accent-2:#ff2d87] [--bg:#12031a] [--text:#f4eefa]"
    >
      <PitchBackground teams={teams}>
        {data.players.map((p) => {
          const color = teamColor(p.team, teams);
          const at = place(p.team, p.x, p.y);
          const trail = p.trail.map((s) => place(p.team, s.x, s.y));
          const average = place(p.team, p.average.x, p.average.y);
          const opacity = dotOpacity(p.since);
          const title = `${p.player} (${p.team}) last seen at minute ${Math.floor(p.minute)}`;
          return (
            <g key={`${p.team}-${p.player}`}>
              {trail.length > 1 && (
                <polyline
                  points={trail.map((t) => `${t.px.toFixed(1)},${t.py.toFixed(1)}`).join(" ")}
                  className="fill-none [stroke-width:.25]"
                  style={{ stroke: color, opacity: opacity * 0.5 }}
                />
              )}
              {/* The hollow ring is where the player usually operates, not where they are. */}
              <circle
                cx={average.px}
                cy={average.py}
                r="1.4"
                className="fill-none [stroke-width:.25]"
                style={{ stroke: color, opacity: 0.45 }}
              >
                <title>{`${p.player} usually operates here`}</title>
              </circle>
              {p.on_ball && (
                <circle
                  cx={at.px}
                  cy={at.py}
                  r="2.2"
                  className="fill-none stroke-white [stroke-width:.3]"
                  style={{ opacity }}
                >
                  <title>{`${p.player} has the ball here`}</title>
                </circle>
              )}
              <circle cx={at.px} cy={at.py} r="1.2" style={{ fill: color, opacity }}>
                <title>{title}</title>
              </circle>
            </g>
          );
        })}

        {ballAt && (
          <g className="pointer-events-none">
            <circle
              cx={ballAt.px}
              cy={ballAt.py}
              r="1"
              className="fill-white stroke-black/60 [stroke-width:.25]"
            />
          </g>
        )}

        {data.players.length === 0 && (
          <text
            x={PITCH_W / 2}
            y={PITCH_H / 2}
            textAnchor="middle"
            className="fill-white/75 text-[2.6px]"
          >
            No player has acted yet at this minute
          </text>
        )}
      </PitchBackground>
    </svg>
  );
}