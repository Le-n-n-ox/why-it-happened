import { useEffect, useId, useRef } from "react";
import { useFrame } from "@/hooks/useFrame";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Example lines in a 300 x 120 plot. Illustration only: the numbers are not real.
const HOME = "M0 62 C60 60 120 58 170 70 S250 96 300 104";
const AWAY = "M0 66 C60 70 120 72 170 50 S250 26 300 14";
const DRAW = "M0 94 C80 92 150 96 170 100 S250 104 300 108";
const NOW_X = 170;
const NOW_Y = { home: 70, away: 50, draw: 100 };
const END_Y = { home: 104, away: 14, draw: 108 };
const SWEEP_MS = 2600;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Refs {
  reveal: SVGRectElement | null;
  head: SVGGElement | null;
  minute: SVGTextElement | null;
  now: SVGGElement | null;
  end: SVGGElement | null;
}

/** p runs 0 to 1: a playhead sweeps right and reveals the lines behind it. */
function paint(p: number, r: Refs): void {
  const x = p * 300;
  r.reveal?.setAttribute("width", String(x));
  r.head?.setAttribute("transform", `translate(${x} 0)`);
  r.head?.setAttribute("opacity", p > 0 && p < 1 ? "1" : "0");
  if (r.minute) r.minute.textContent = `${Math.round(p * 90)}'`;
  r.now?.setAttribute("opacity", String(clamp01((x - NOW_X) / 12)));
  r.end?.setAttribute("opacity", String(clamp01((p - 0.96) / 0.04)));
}

/** Example win probability lines. `on` starts the sweep. */
export function WinChartGraphic({ on }: { on: boolean }) {
  const uid = useId().replace(/:/g, "");
  const clip = `wc-clip-${uid}`;
  const glow = `wc-glow-${uid}`;
  const homeFill = `wc-home-${uid}`;
  const awayFill = `wc-away-${uid}`;
  const headFill = `wc-head-${uid}`;

  const reduced = useReducedMotion();
  const refs = useRef<Refs>({ reveal: null, head: null, minute: null, now: null, end: null });

  // Before it starts: empty. For people who prefer reduced motion: the finished chart.
  useEffect(() => {
    if (reduced) paint(1, refs.current);
    else if (!on) paint(0, refs.current);
  }, [reduced, on]);

  useFrame(on && !reduced, (ms) => paint(ease(clamp01(ms / SWEEP_MS)), refs.current), SWEEP_MS);

  return (
    <svg viewBox="0 0 336 148" role="img" aria-label="Example win probability lines for home, draw and away" className="w-full">
      <defs>
        <clipPath id={clip}>
          <rect ref={(el) => { refs.current.reveal = el; }} x="0" y="-8" width="0" height="140" />
        </clipPath>
        <filter id={glow} x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={homeFill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--c1)", stopOpacity: 0.26 }} />
          <stop offset="1" style={{ stopColor: "var(--c1)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id={awayFill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--c2)", stopOpacity: 0.3 }} />
          <stop offset="1" style={{ stopColor: "var(--c2)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id={headFill} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      <g transform="translate(28 8)">
        {/* Grid and axis labels */}
        <g className="stroke-line" strokeWidth="0.6" strokeOpacity="0.7">
          {[0, 30, 60, 90, 120].map((y) => <path key={y} d={`M0 ${y}H300`} strokeDasharray="2 4" />)}
        </g>
        {[[0, "100%"], [60, "50%"], [120, "0%"]].map(([y, label]) => (
          <text key={label} x={-6} y={y} dy=".35em" textAnchor="end" className="fill-muted text-[8px]">{label}</text>
        ))}
        <text x="0" y="134" className="fill-muted text-[8px]">0'</text>
        <text x="150" y="134" textAnchor="middle" className="fill-muted text-[8px]">45'</text>
        <text x="300" y="134" textAnchor="end" className="fill-muted text-[8px]">90'</text>

        {/* Lines and areas, revealed by the playhead */}
        <g clipPath={`url(#${clip})`}>
          <path d={`${HOME} L300 120 L0 120 Z`} fill={`url(#${homeFill})`} />
          <path d={`${AWAY} L300 120 L0 120 Z`} fill={`url(#${awayFill})`} />
          <path d={HOME} fill="none" strokeWidth="2.2" strokeLinecap="round" filter={`url(#${glow})`} className="stroke-c1" />
          <path d={AWAY} fill="none" strokeWidth="2.2" strokeLinecap="round" filter={`url(#${glow})`} className="stroke-c2" />
          <path d={DRAW} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 3" className="stroke-muted" />
        </g>

        {/* "Now": a divider and one dot per line, with a pulse on the leader */}
        <g ref={(el) => { refs.current.now = el; }} opacity="0">
          <path d={`M${NOW_X} 0V120`} className="stroke-muted" strokeDasharray="3 4" strokeOpacity=".7" />
          <text x={NOW_X} y="-1" textAnchor="middle" className="fill-muted text-[7px] font-semibold uppercase tracking-wider">Now</text>
          <circle cx={NOW_X} cy={NOW_Y.home} r="2" className="fill-c1" />
          <circle cx={NOW_X} cy={NOW_Y.draw} r="1.6" className="fill-muted" />
          <circle cx={NOW_X} cy={NOW_Y.away} r="5" className="fill-accent" opacity=".14" />
          <circle cx={NOW_X} cy={NOW_Y.away} r="3" fill="none" strokeWidth="1"
            className="origin-center animate-ring stroke-accent [transform-box:fill-box]" />
          <circle cx={NOW_X} cy={NOW_Y.away} r="2.4" className="fill-accent" />
        </g>

        {/* End of the lines: dots and names */}
        <g ref={(el) => { refs.current.end = el; }} opacity="0">
          <circle cx="300" cy={END_Y.home} r="2.4" className="fill-c1" />
          <circle cx="300" cy={END_Y.away} r="2.4" className="fill-c2" />
          <circle cx="300" cy={END_Y.draw} r="2" className="fill-muted" />
          <text x="296" y={END_Y.home - 6} textAnchor="end" className="fill-c1 text-[7.5px] font-bold">Home</text>
          <text x="296" y={END_Y.away + 12} textAnchor="end" className="fill-c2 text-[7.5px] font-bold">Away</text>
          <text x="296" y={END_Y.draw + 9} textAnchor="end" className="fill-muted text-[7.5px] font-bold">Draw</text>
        </g>

        {/* Playhead with a live minute counter */}
        <g ref={(el) => { refs.current.head = el; }} opacity="0">
          <rect x="-28" y="0" width="28" height="120" fill={`url(#${headFill})`} />
          <path d="M0 0V120" className="stroke-accent" strokeWidth="1" />
          <text ref={(el) => { refs.current.minute = el; }} x="0" y="-1" textAnchor="middle"
            className="fill-accent text-[8px] font-bold tabular-nums">0'</text>
        </g>
      </g>
    </svg>
  );
}