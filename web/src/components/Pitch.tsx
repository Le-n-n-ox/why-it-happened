

// web/src/components/Pitch.tsx - top-down pitch drawn as SVG (105 x 68, the real pitch size in metres).
import type { KeyboardEvent } from "react";
import { PitchBackground } from "@/components/PitchBackground";
import { PITCH_H, PITCH_W, teamColor, toPitch } from "@/lib/match";
import type { MatchEvent } from "@/types/types";

interface Props {
  events: MatchEvent[]; // everything that has happened so far (drawn faintly)
  selected: MatchEvent[]; // the evidence being explained, in order (drawn bright, numbered)
  teams: string[]; // the first team is drawn as is, the second team's x is flipped
  ball?: MatchEvent | null; // the latest tick
  onEventClick?: (id: string) => void; // click or Enter on an event asks why it mattered
}

const HIT = "cursor-pointer fill-transparent outline-none focus-visible:stroke-white [stroke-width:.4]";

export function Pitch({ events, selected, teams, ball, onEventClick }: Props) {
  const firstTeam = teams[0];
  const chosen = new Set(selected.map((e) => e.id));
  const path = selected
    .map((e) => toPitch(e, firstTeam))
    .map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`)
    .join(" ");
  const ballAt = ball ? toPitch(ball, firstTeam) : null;
  const label = selected.length
    ? `Pitch map: ${selected.length} evidence events highlighted`
    : "Pitch map of match events";

  const hit = (e: MatchEvent) =>
    onEventClick
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": `Explain event ${e.id}`,
          onClick: () => onEventClick(e.id),
          onKeyDown: (ev: KeyboardEvent<SVGCircleElement>) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              onEventClick(e.id);
            }
          },
        }
      : {};

  return (
    <svg
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      role="img"
      aria-label={label}
      // The pitch keeps its own colours in both themes.
      className="h-auto w-full rounded-card shadow-card [--accent:#00ff85] [--accent-2:#ff2d87] [--bg:#12031a] [--text:#f4eefa]"
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" className="fill-accent" />
        </marker>
      </defs>

      <PitchBackground teams={teams} />

      {/* Unselected events — faint dots, clickable if onEventClick is provided */}
      {events.filter((e) => !chosen.has(e.id)).map((e) => {
        const { px, py } = toPitch(e, firstTeam);
        return (
          <g key={e.id}>
            <circle cx={px} cy={py} r="0.8" className="[fill-opacity:.45]" style={{ fill: teamColor(e.team, teams) }} />
            {onEventClick && (
              <circle cx={px} cy={py} r="2" className={HIT} {...hit(e)}>
                <title>{`${e.id}: ${e.team} ${e.type} (${Math.floor(e.minute)}')`}</title>
              </circle>
            )}
          </g>
        );
      })}

      {/* Path connecting selected events in order */}
      {selected.length > 1 && (
        <polyline
          points={path}
          markerEnd="url(#arrow)"
          className="fill-none stroke-accent [stroke-dasharray:1.2_1] [stroke-width:.5]"
        />
      )}

      {/* Selected events — bright dots with numbers, ring pulse, and title */}
      {selected.map((e, i) => {
        const { px, py } = toPitch(e, firstTeam);
        return (
          <g key={e.id}>
            <circle
              cx={px} cy={py} r="2"
              className="origin-center animate-ring fill-none [stroke-width:.4] [transform-box:fill-box]"
              style={{ stroke: teamColor(e.team, teams) }}
            />
            <circle
              cx={px} cy={py} r="2"
              className="stroke-fg [fill-opacity:1] [stroke-width:.3]"
              style={{ fill: teamColor(e.team, teams) }}
            >
              <title>{`${e.id}: ${e.team} ${e.type} (${Math.floor(e.minute)}')`}</title>
            </circle>
            <text
              x={px} y={py} dy=".35em" textAnchor="middle"
              className="pointer-events-none fill-bg text-[2px] font-bold"
            >
              {i + 1}
            </text>
            {onEventClick && <circle cx={px} cy={py} r="2.4" className={HIT} {...hit(e)} />}
          </g>
        );
      })}

      {/* Ball with pulse ring */}
      {ballAt && (
        <g className="pointer-events-none">
          <circle
            cx={ballAt.px} cy={ballAt.py} r="1.4"
            className="origin-center animate-ring fill-none stroke-white [stroke-width:.3] [transform-box:fill-box]"
          />
          <circle cx={ballAt.px} cy={ballAt.py} r="1" className="fill-white stroke-black/60 [stroke-width:.25]" />
        </g>
      )}

      {/* Empty state hint */}
      {selected.length === 0 && (
        <text
          x={PITCH_W / 2} y={PITCH_H - 4} textAnchor="middle"
          className="fill-white/75 text-[2.6px]"
        >
          {onEventClick ? "Click an event to see why it mattered" : "Select an insight to see its evidence"}
        </text>
      )}
    </svg>
  );
}