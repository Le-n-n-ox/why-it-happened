// web/src/Heatmap.tsx - where a player's cited events cluster on the pitch.
import { useMemo } from "react";
import { PITCH_H, PITCH_W, toPitch } from "@/lib/match";
import type { MatchEvent } from "@/types/types";

interface Props {
  events: MatchEvent[];
  teams: string[]; // same list the Pitch gets, so both maps face the same way
  color?: string;
}

const COLS = 21;
const ROWS = 14;

export function Heatmap({ events, teams, color = "var(--heat)" }: Props) {
  const { cells, peak } = useMemo(() => {
    const grid = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
    for (const e of events) {
      const { px, py } = toPitch(e, teams[0]);
      const cx = Math.min(COLS - 1, Math.max(0, Math.floor((px / PITCH_W) * COLS)));
      const cy = Math.min(ROWS - 1, Math.max(0, Math.floor((py / PITCH_H) * ROWS)));
      // Spread each event over its neighbours so the map reads as zones, not dots.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = cx + dx;
          const gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) continue;
          grid[gy][gx] += dx === 0 && dy === 0 ? 1 : 0.4;
        }
      }
    }
    const flat = grid.flatMap((row, y) => row.map((v, x) => ({ x, y, v })));
    return { cells: flat.filter((c) => c.v > 0), peak: Math.max(0, ...flat.map((c) => c.v)) };
  }, [events, teams]);

  return (
    <figure className="heatmap">
      <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} role="img" aria-label={`Heatmap of ${events.length} events`}>
        <rect width={PITCH_W} height={PITCH_H} className="pitch__grass" />
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={(c.x * PITCH_W) / COLS}
            y={(c.y * PITCH_H) / ROWS}
            width={PITCH_W / COLS}
            height={PITCH_H / ROWS}
            fill={color}
            opacity={0.15 + 0.8 * (c.v / peak)}
          />
        ))}
        <g className="pitch__lines">
          <rect x="0.3" y="0.3" width={PITCH_W - 0.6} height={PITCH_H - 0.6} />
          <line x1={PITCH_W / 2} y1="0" x2={PITCH_W / 2} y2={PITCH_H} />
          <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="9.15" />
          <rect x="0.3" y="13.84" width="16.5" height="40.32" />
          <rect x={PITCH_W - 16.8} y="13.84" width="16.5" height="40.32" />
          <rect x="0.3" y="24.84" width="5.5" height="18.32" />
          <rect x={PITCH_W - 5.8} y="24.84" width="5.5" height="18.32" />
        </g>
      </svg>
      <figcaption>
        {events.length === 0 ? "No events to map yet." : `${events.length} events · brighter = more activity`}
      </figcaption>
    </figure>
  );
}