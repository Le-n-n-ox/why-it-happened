// web/src/components/PitchBackground.tsx - the pitch itself, so every pitch map in the app looks the same.
import type { ReactNode } from "react";
import { PITCH_H, PITCH_W } from "@/lib/match";

interface Props {
  teams: string[]; // the first team is drawn as is, the second team's x is flipped
  children?: ReactNode; // drawn on top of the pitch
}

/** Use inside an <svg viewBox="0 0 105 68">: the grass, the mow stripes, the lines, the spots and the labels. */
export function PitchBackground({ teams, children }: Props) {
  return (
    <>
      <defs>
        {/* Soft edge darkening so the pitch reads as a lit surface */}
        <radialGradient id="pitchVignette" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity=".18" />
        </radialGradient>
      </defs>

      <rect width={PITCH_W} height={PITCH_H} className="fill-grass" />

      {/* Mow stripes */}
      <g className="fill-white/[.035]">
        {Array.from({ length: 10 }, (_, i) =>
          i % 2 === 0 ? (
            <rect key={i} x={(i * PITCH_W) / 10} y="0" width={PITCH_W / 10} height={PITCH_H} />
          ) : null,
        )}
      </g>

      {/* Vignette over the grass, under the lines */}
      <rect width={PITCH_W} height={PITCH_H} fill="url(#pitchVignette)" />

      {/* Touch line heaviest, interior lines lighter — a real broadcast pitch has this hierarchy */}
      <g fill="none" stroke="white">
        <rect x="0.3" y="0.3" width={PITCH_W - 0.6} height={PITCH_H - 0.6} strokeOpacity=".55" strokeWidth=".35" />
        <line x1={PITCH_W / 2} y1="0" x2={PITCH_W / 2} y2={PITCH_H} strokeOpacity=".5" strokeWidth=".3" />
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="9.15" strokeOpacity=".4" strokeWidth=".3" />
        <rect x="0.3" y="13.84" width="16.5" height="40.32" strokeOpacity=".4" strokeWidth=".3" />
        <rect x={PITCH_W - 16.8} y="13.84" width="16.5" height="40.32" strokeOpacity=".4" strokeWidth=".3" />
        <rect x="0.3" y="24.84" width="5.5" height="18.32" strokeOpacity=".35" strokeWidth=".3" />
        <rect x={PITCH_W - 5.8} y="24.84" width="5.5" height="18.32" strokeOpacity=".35" strokeWidth=".3" />

        {/* Corner arcs */}
        <path d="M0.3 3.5A3.2 3.2 0 0 1 3.5 0.3" strokeOpacity=".4" strokeWidth=".3" />
        <path d={`M${PITCH_W - 3.5} 0.3A3.2 3.2 0 0 1 ${PITCH_W - 0.3} 3.5`} strokeOpacity=".4" strokeWidth=".3" />
        <path d={`M0.3 ${PITCH_H - 3.5}A3.2 3.2 0 0 0 3.5 ${PITCH_H - 0.3}`} strokeOpacity=".4" strokeWidth=".3" />
        <path d={`M${PITCH_W - 3.5} ${PITCH_H - 0.3}A3.2 3.2 0 0 0 ${PITCH_W - 0.3} ${PITCH_H - 3.5}`} strokeOpacity=".4" strokeWidth=".3" />
      </g>

      {/* Spots */}
      <g className="fill-white/60">
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="0.4" />
        <circle cx="11" cy={PITCH_H / 2} r="0.4" />
        <circle cx={PITCH_W - 11} cy={PITCH_H / 2} r="0.4" />
      </g>

      {teams.length >= 2 && (
        <>
          <text x="3" y="4.5" className="fill-white/75 text-[2.4px]">{`${teams[0]} attack →`}</text>
          <text x={PITCH_W - 3} y="4.5" textAnchor="end" className="fill-white/75 text-[2.4px]">
            {`← ${teams[1]} attack`}
          </text>
        </>
      )}

      {children}
    </>
  );
}