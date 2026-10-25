import { useId, useLayoutEffect, useRef } from "react";
import { useFrame } from "@/hooks/useFrame";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Example lines in a 300 x 120 plot. Illustration only: the numbers are not real.
const HOME = "M0 62 C60 60 120 58 170 70 S250 96 300 104";
const AWAY = "M0 66 C60 70 120 72 170 50 S250 26 300 14";
const DRAW = "M0 94 C80 92 150 96 170 100 S250 104 300 108";
const GOAL_X = 170; // 51' on a 90-minute axis: the away line takes off here
const GOAL_Y = { home: 70, away: 50, draw: 100 };
const END_Y = { home: 104, away: 14, draw: 108 };
const SWEEP_MS = 2600;
const HOLD_MS = 2200; // the finished chart stays up this long before the loop restarts

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Refs {
  reveal: SVGRectElement | null;
  head: SVGGElement | null;
  minute: SVGTextElement | null;
  goal: SVGGElement | null;
  end: SVGGElement | null;
}

/** p runs 0 to 1: a playhead sweeps right and reveals the lines behind it. */
function paint(p: number, r: Refs): void {
  const x = p * 300;
  r.reveal?.setAttribute("width", String(x));
  r.head?.setAttribute("transform", `translate(${x} 0)`);
  r.head?.setAttribute("opacity", p > 0 && p < 1 ? "1" : "0");
  if (r.minute) {
    r.minute.textContent = `${Math.round(p * 90)}'`;
    // Step aside while passing the goal label, so the two never overprint.
    r.minute.setAttribute("opacity", Math.abs(x - GOAL_X) < 18 ? "0" : "1");
  }
  r.goal?.setAttribute("opacity", String(clamp01((x - GOAL_X) / 12)));
  r.end?.setAttribute("opacity", String(clamp01((p - 0.96) / 0.04)));
}

/** Example win probability lines. `on` starts the sweep; it also pauses while off-screen. */
export function WinChartGraphic({ on }: { on: boolean }) {
  // Strip everything but letters, digits, _ and -, so ids stay valid in url(#...) on any React version.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clip = `wc-clip-${uid}`;
  const glow = `wc-glow-${uid}`;
  const homeFill = `wc-home-${uid}`;
  const awayFill = `wc-away-${uid}`;
  const headFill = `wc-head-${uid}`;

  const reduced = useReducedMotion();
  const [viewRef, visible] = useInView<HTMLDivElement>({ once: false, threshold: 0.1 });
  const refs = useRef<Refs>({ reveal: null, head: null, minute: null, goal: null, end: null });

  // Before it starts: empty. For people who prefer reduced motion: the finished chart, with no blank frame.
  useLayoutEffect(() => {
    if (reduced) paint(1, refs.current);
    else if (!on) paint(0, refs.current);
  }, [reduced, on]);

  useFrame(
    on && visible && !reduced,
    (ms) => paint(ease(clamp01(ms / SWEEP_MS)), refs.current),
    SWEEP_MS + HOLD_MS,
  );

  return (
    <div ref={viewRef}>
      <svg
        viewBox="0 0 340 154"
        role="img"
        aria-label="Example win probability lines for home, draw and away, with a goal for the away side at 51 minutes"
        className="h-auto w-full"
      >
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

        <g transform="translate(34 12)">
          {/* Grid and axis labels */}
          <g className="stroke-line" strokeWidth="0.6" strokeOpacity="0.7">
            {[0, 30, 60, 90, 120].map((y) => <path key={y} d={`M0 ${y}H300`} strokeDasharray="2 4" />)}
          </g>
          {[[0, "100%"], [60, "50%"], [120, "0%"]].map(([y, label]) => (
            <text key={label} x={-6} y={y} dy=".35em" textAnchor="end" className="fill-muted text-[10px]">{label}</text>
          ))}
          <text x="0" y="136" className="fill-muted text-[10px]">0&apos;</text>
          <text x="150" y="136" textAnchor="middle" className="fill-muted text-[10px]">45&apos;</text>
          <text x="300" y="136" textAnchor="end" className="fill-muted text-[10px]">90&apos;</text>

          {/* Lines and areas, revealed by the playhead */}
          <g clipPath={`url(#${clip})`}>
            <path d={`${HOME} L300 120 L0 120 Z`} fill={`url(#${homeFill})`} />
            <path d={`${AWAY} L300 120 L0 120 Z`} fill={`url(#${awayFill})`} />
            <path d={HOME} fill="none" strokeWidth="2.2" strokeLinecap="round" filter={`url(#${glow})`} className="stroke-c1" />
            <path d={AWAY} fill="none" strokeWidth="2.2" strokeLinecap="round" filter={`url(#${glow})`} className="stroke-c2" />
            <path d={DRAW} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 3" className="stroke-muted" />
          </g>

          {/* The goal: a divider, one dot per line, and a pulse on the scoring side */}
          <g ref={(el) => { refs.current.goal = el; }} opacity="0">
            <path d={`M${GOAL_X} 0V120`} className="stroke-muted" strokeDasharray="3 4" strokeOpacity=".7" />
            <text x={GOAL_X} y="-2" textAnchor="middle" className="fill-c2 text-[9px] font-bold uppercase tracking-wider">
              Goal 51&apos;
            </text>
            <circle cx={GOAL_X} cy={GOAL_Y.home} r="2" className="fill-c1" />
            <circle cx={GOAL_X} cy={GOAL_Y.draw} r="1.6" className="fill-muted" />
            <circle cx={GOAL_X} cy={GOAL_Y.away} r="5" className="fill-c2" opacity=".16" />
            <circle cx={GOAL_X} cy={GOAL_Y.away} r="3" fill="none" strokeWidth="1"
              className="origin-center animate-ring stroke-c2 [transform-box:fill-box]" />
            <circle cx={GOAL_X} cy={GOAL_Y.away} r="2.4" className="fill-c2" />
          </g>

          {/* End of the lines: dots and names */}
          <g ref={(el) => { refs.current.end = el; }} opacity="0">
            <circle cx="300" cy={END_Y.home} r="2.4" className="fill-c1" />
            <circle cx="300" cy={END_Y.away} r="2.4" className="fill-c2" />
            <circle cx="300" cy={END_Y.draw} r="2" className="fill-muted" />
            <text x="294" y={END_Y.home - 7} textAnchor="end" className="fill-c1 text-[9.5px] font-bold">Home</text>
            <text x="294" y={END_Y.away + 14} textAnchor="end" className="fill-c2 text-[9.5px] font-bold">Away</text>
            <text x="294" y={END_Y.draw + 11} textAnchor="end" className="fill-muted text-[9.5px] font-bold">Draw</text>
          </g>

          {/* Playhead with a live minute counter */}
          <g ref={(el) => { refs.current.head = el; }} opacity="0">
            <rect x="-28" y="0" width="28" height="120" fill={`url(#${headFill})`} />
            <path d="M0 0V120" className="stroke-accent" strokeWidth="1" />
            <text ref={(el) => { refs.current.minute = el; }} x="0" y="-2" textAnchor="middle"
              className="fill-accent text-[10px] font-bold tabular-nums">0&apos;</text>
          </g>
        </g>
      </svg>
    </div>
  );
}