// web/src/Pitch.tsx - top-down pitch drawn as SVG (105 x 68, the real pitch size in metres).
import type { MatchEvent } from "./types";
import { PITCH_H, PITCH_W, teamColor, toPitch } from "./match";

interface Props {
  events: MatchEvent[]; // everything that has happened so far (drawn faintly)
  selected: MatchEvent[]; // the evidence of the chosen insight, in order (drawn bright, numbered)
  teams: string[]; // first team attacks right, second is rotated
}

export function Pitch({ events, selected, teams }: Props) {
  const leftTeam = teams[0];
  const chosen = new Set(selected.map((e) => e.id));
  const path = selected
    .map((e) => toPitch(e, leftTeam))
    .map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`)
    .join(" ");
  const label = selected.length
    ? `Pitch map: ${selected.length} evidence events highlighted`
    : "Pitch map of match events";

  return (
    <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} role="img" aria-label={label} className="pitch">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" className="pitch__arrow" />
        </marker>
      </defs>
      <rect width={PITCH_W} height={PITCH_H} className="pitch__grass" />
      <g className="pitch__stripes">
        {Array.from({ length: 10 }, (_, i) =>
          i % 2 === 0 ? (
            <rect key={i} x={(i * PITCH_W) / 10} y="0" width={PITCH_W / 10} height={PITCH_H} />
          ) : null,
        )}
      </g>
      <g className="pitch__lines">
        <rect x="0.3" y="0.3" width={PITCH_W - 0.6} height={PITCH_H - 0.6} />
        <line x1={PITCH_W / 2} y1="0" x2={PITCH_W / 2} y2={PITCH_H} />
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="9.15" />
        <rect x="0.3" y="13.84" width="16.5" height="40.32" />
        <rect x={PITCH_W - 16.8} y="13.84" width="16.5" height="40.32" />
        <rect x="0.3" y="24.84" width="5.5" height="18.32" />
        <rect x={PITCH_W - 5.8} y="24.84" width="5.5" height="18.32" />
      </g>
      <g className="pitch__spots">
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="0.4" />
        <circle cx="11" cy={PITCH_H / 2} r="0.4" />
        <circle cx={PITCH_W - 11} cy={PITCH_H / 2} r="0.4" />
      </g>

      {teams.length >= 2 && (
        <>
          <text x="3" y="4.5" className="pitch__label">{`${teams[0]} attack →`}</text>
          <text x={PITCH_W - 3} y="4.5" textAnchor="end" className="pitch__label">
            {`← ${teams[1]} attack`}
          </text>
        </>
      )}

      {events.filter((e) => !chosen.has(e.id)).map((e) => {
        const { px, py } = toPitch(e, leftTeam);
        return (
          <circle key={e.id} cx={px} cy={py} r="0.8" className="pitch__dot"
            style={{ fill: teamColor(e.team, teams) }} />
        );
      })}

      {selected.length > 1 && <polyline points={path} className="pitch__path" markerEnd="url(#arrow)" />}

      {selected.map((e, i) => {
        const { px, py } = toPitch(e, leftTeam);
        return (
          <g key={e.id}>
            <circle cx={px} cy={py} r="2" className="pitch__pulse" style={{ stroke: teamColor(e.team, teams) }} />
            <circle cx={px} cy={py} r="2" className="pitch__dot pitch__dot--selected"
              style={{ fill: teamColor(e.team, teams) }}>
              <title>{`${e.id}: ${e.team} ${e.type} (${Math.floor(e.minute)}')`}</title>
            </circle>
            <text x={px} y={py} dy=".35em" textAnchor="middle" className="pitch__num">{i + 1}</text>
          </g>
        );
      })}

      {selected.length === 0 && (
        <text x={PITCH_W / 2} y={PITCH_H - 4} textAnchor="middle" className="pitch__hint">
          Select an insight to see its evidence
        </text>
      )}
    </svg>
  );
}