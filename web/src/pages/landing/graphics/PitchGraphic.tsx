import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@/hooks/useFrame";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Three passes and a shot, each drawn over `dur` ms from `start` ms into the loop.
const PASSES = [
  { d: "M18 52 Q34 40 50 44", start: 300, dur: 900 },
  { d: "M50 44 Q66 30 82 34", start: 1350, dur: 900 },
  { d: "M82 34 Q90 33 98 40", start: 2400, dur: 800 },
  { d: "M98 40 L117 40", start: 3450, dur: 600 }, // the shot
] as const;

// The four players on the move, in order.
const NODES: [number, number][] = [[18, 52], [50, 44], [82, 34], [98, 40]];
const IDS = ["d17", "d18", "d19", "d20"];

const HOME: [number, number][] = [[22, 30], [34, 58], [46, 26], [58, 52], [70, 62], [76, 22], [88, 54], [94, 26]];
// The last one is the keeper: the shot goes past him.
const AWAY: [number, number][] = [[40, 40], [64, 34], [84, 46], [112, 45]];

const CYCLE = 8400; // one loop
const LOOPS = 3; // then hold the finished still; the pause button replays it
const FADE_START = 6600;
const FADE_END = 7600;
const STATIC_AT = 5600; // the frame shown to people who prefer reduced motion, and after the last loop
const GOAL_AT = PASSES[3].start + PASSES[3].dur;
// When the ball reaches each of the four players.
const ARRIVES = [PASSES[0].start, ...PASSES.slice(0, 3).map((p) => p.start + p.dur)];

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** How many of the four players the ball has reached. Drops to 0 once the scene has faded out. */
const stepAt = (ms: number): number => {
  const t = ms % CYCLE;
  return t >= FADE_END ? 0 : ARRIVES.filter((a) => t >= a).length;
};

interface Refs {
  move: SVGGElement | null;
  lines: (SVGPathElement | null)[];
  lens: number[]; // cached path lengths
  glow: SVGPathElement | null;
  ball: SVGCircleElement | null;
  trail: (SVGCircleElement | null)[];
  markers: (SVGGElement | null)[];
  rings: (SVGCircleElement | null)[];
  ids: (SVGGElement | null)[];
  burst: (SVGCircleElement | null)[];
  net: SVGRectElement | null;
  goal: SVGGElement | null;
}

/** Draws the scene at `ms` into the loop by writing attributes straight to the SVG: no React re-render per frame. */
function paint(ms: number, r: Refs): void {
  const t = ms % CYCLE;
  r.move?.setAttribute("opacity", String(1 - clamp01((t - FADE_START) / (FADE_END - FADE_START))));

  // Draw each pass, and find where the ball is.
  let ball: [number, number] = NODES[0];
  let moving: { el: SVGPathElement; len: number; prog: number } | null = null;
  for (const [i, p] of PASSES.entries()) {
    const el = r.lines[i];
    if (!el) continue;
    if (r.lens[i] === undefined) r.lens[i] = el.getTotalLength();
    const len = r.lens[i];
    const raw = clamp01((t - p.start) / p.dur);
    const prog = ease(raw);
    el.style.strokeDashoffset = String(1 - prog);
    if (i === 3 && r.glow) r.glow.style.strokeDashoffset = String(1 - prog);
    if (raw >= 1) {
      const end = el.getPointAtLength(len);
      ball = [end.x, end.y];
    } else if (raw > 0) {
      const pt = el.getPointAtLength(len * prog);
      ball = [pt.x, pt.y];
      moving = { el, len, prog };
    }
  }
  r.ball?.setAttribute("cx", String(ball[0]));
  r.ball?.setAttribute("cy", String(ball[1]));

  // A short comet trail behind the ball while it is travelling.
  r.trail.forEach((c, k) => {
    if (!c) return;
    if (!moving) {
      c.setAttribute("opacity", "0");
      return;
    }
    const lag = Math.max(0, moving.prog - (k + 1) * 0.07);
    const pt = moving.el.getPointAtLength(moving.len * lag);
    c.setAttribute("cx", String(pt.x));
    c.setAttribute("cy", String(pt.y));
    c.setAttribute("opacity", String(0.5 - k * 0.1));
  });

  // Numbered marker, evidence chip and a touch ring for each player as the ball arrives.
  ARRIVES.forEach((a, i) => {
    const show = String(clamp01((t - a) / 250));
    r.markers[i]?.setAttribute("opacity", show);
    r.ids[i]?.setAttribute("opacity", show);
    const ring = r.rings[i];
    if (ring) {
      const k = clamp01((t - a) / 700);
      ring.setAttribute("r", String(1.8 + k * 4.2));
      ring.setAttribute("opacity", t >= a && k < 1 ? String((1 - k) * 0.7) : "0");
    }
  });

  // Goal: two ripples, a flash through the net, and the chip.
  const g = t - GOAL_AT;
  r.burst.forEach((c, i) => {
    if (!c) return;
    const k = clamp01((g - i * 220) / 1000);
    c.setAttribute("r", String(2 + k * 9));
    c.setAttribute("opacity", g - i * 220 > 0 && k < 1 ? String((1 - k) * 0.8) : "0");
  });
  r.net?.setAttribute("opacity", g > 0 ? String(Math.max(0, 1 - g / 900) * 0.7) : "0");
  const chip = clamp01((g - 100) / 300);
  r.goal?.setAttribute("opacity", String(chip));
  r.goal?.setAttribute("transform", `translate(0 ${(1 - chip) * 2})`);
}

interface Props {
  /** Called when the ball reaches another player (0 to 4). The hero uses it to reveal its "Why?" steps. */
  onStep?: (step: number) => void;
}

/** Decorative pitch: a counter-attack that ends in a goal, looping three times. Illustration only. */
export function PitchGraphic({ onStep }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const vignette = `pg-vignette-${uid}`;
  const net = `pg-net-${uid}`;
  const glow = `pg-glow-${uid}`;

  const [viewRef, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const stepRef = useRef(-1);
  const onStepRef = useRef(onStep);
  const refs = useRef<Refs>({
    move: null, lines: [], lens: [], glow: null, ball: null, trail: [], markers: [], rings: [], ids: [], burst: [], net: null, goal: null,
  });

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const report = useCallback((n: number) => {
    if (n === stepRef.current) return;
    stepRef.current = n;
    onStepRef.current?.(n);
  }, []);

  // Starting frame, or a finished still for people who prefer reduced motion. Layout effect: no flash of an empty pitch.
  useLayoutEffect(() => {
    paint(reduced ? STATIC_AT : 0, refs.current);
    report(reduced ? ARRIVES.length : 0);
  }, [reduced, report]);

  // Scrolling away rearms the loop, so it plays again on return.
  useEffect(() => {
    if (!inView) setDone(false);
  }, [inView]);

  const active = inView && !reduced && !paused && !done;
  useFrame(active, (ms) => {
    if (ms >= LOOPS * CYCLE) {
      paint(STATIC_AT, refs.current);
      report(ARRIVES.length);
      setDone(true);
      return;
    }
    paint(ms, refs.current);
    report(stepAt(ms));
  });

  const stopped = paused || done;
  const toggle = () => {
    if (stopped) {
      setPaused(false);
      setDone(false);
    } else {
      setPaused(true);
    }
  };

  return (
    <div ref={viewRef} className="relative">
      <svg
        viewBox="0 0 120 80"
        role="img"
        aria-label="Illustration: a counter-attack that ends in a goal, with the evidence events lighting up in order"
        // The pitch keeps its own colours in both themes: the light theme's darker tokens vanish against grass.
        className="w-full rounded-card border border-line bg-grass shadow-lifted [--accent-ink:#06210f] [--accent:#6fcf8b] [--c1:#00ff85] [--c2:#ff2d87]"
      >
        <defs>
          <radialGradient id={vignette} cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity=".24" />
          </radialGradient>
          <pattern id={net} width="1.6" height="1.6" patternUnits="userSpaceOnUse">
            <path d="M0 0H1.6M0 0V1.6" stroke="white" strokeOpacity=".4" strokeWidth=".18" fill="none" />
          </pattern>
          <filter id={glow} x="-20%" y="-300%" width="140%" height="700%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Turf: eight mowing stripes, then a vignette inside the touch line */}
        {Array.from({ length: 8 }, (_, i) =>
          i % 2 === 0 ? <rect key={i} x={2 + i * 14.5} y={2} width={14.5} height={76} className="fill-white/[.035]" /> : null,
        )}
        <rect x={2} y={2} width={116} height={76} fill={`url(#${vignette})`} />

        {/* Markings: the touch line heaviest, interior lines lighter */}
        <g fill="none" stroke="white" strokeWidth=".5">
          <rect x="2" y="2" width="116" height="76" strokeOpacity=".4" />
          <path d="M60 2v76" strokeOpacity=".38" />
          <circle cx="60" cy="40" r="10" strokeOpacity=".28" />
          <rect x="2" y="20" width="16" height="40" strokeOpacity=".28" />
          <rect x="102" y="20" width="16" height="40" strokeOpacity=".28" />
          <rect x="2" y="30" width="6" height="20" strokeOpacity=".22" />
          <rect x="112" y="30" width="6" height="20" strokeOpacity=".22" />
          <path d="M2 6A4 4 0 0 1 6 2M114 2A4 4 0 0 1 118 6M2 74A4 4 0 0 0 6 78M114 78A4 4 0 0 0 118 74" strokeOpacity=".28" />
        </g>
        <circle cx="60" cy="40" r=".6" className="fill-white/45" />

        {/* Goal net, with a flash that plays on the goal */}
        <rect x="117.4" y="35" width="2.6" height="10" fill={`url(#${net})`} />
        <path d="M117.4 35h2.6M117.4 45h2.6" stroke="white" strokeOpacity=".7" strokeWidth=".5" />
        <rect ref={(el) => { refs.current.net = el; }} x="117.4" y="35" width="2.6" height="10" className="fill-white" opacity="0" />

        {/* Players: soft shadows, then dots that breathe */}
        <g className="fill-black/15">
          {[...HOME, ...AWAY].map(([x, y]) => <circle key={`s-${x}-${y}`} cx={x} cy={y + 0.5} r="1.6" />)}
        </g>
        {HOME.map(([x, y], i) => (
          <circle key={`h-${x}-${y}`} cx={x} cy={y} r="1.3"
            className="origin-center animate-breathe fill-c1/45 [transform-box:fill-box]"
            style={{ animationDelay: `${(i * 370) % 3000}ms` }} />
        ))}
        {AWAY.map(([x, y], i) => (
          <circle key={`a-${x}-${y}`} cx={x} cy={y} r="1.3"
            className="origin-center animate-breathe fill-c2/55 [transform-box:fill-box]"
            style={{ animationDelay: `${(i * 530 + 400) % 3000}ms` }} />
        ))}
        {NODES.map(([x, y]) => <circle key={`n-${x}-${y}`} cx={x} cy={y} r="1.6" className="fill-c1" />)}

        {/* The move: everything here fades out at the end of each loop */}
        <g ref={(el) => { refs.current.move = el; }}>
          <path ref={(el) => { refs.current.glow = el; }} d={PASSES[3].d} pathLength={1} fill="none" strokeWidth="3.6"
            strokeLinecap="round" strokeDasharray="1" strokeOpacity=".5" filter={`url(#${glow})`}
            className="stroke-accent" style={{ strokeDashoffset: 1 }} />
          {PASSES.map((p, i) => (
            <path key={p.d} ref={(el) => { refs.current.lines[i] = el; }} d={p.d} pathLength={1} fill="none"
              strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1"
              className={i === 3 ? "stroke-accent" : "stroke-c1"} style={{ strokeDashoffset: 1 }} />
          ))}

          {NODES.map(([x, y], i) => (
            <circle key={`r-${x}`} ref={(el) => { refs.current.rings[i] = el; }} cx={x} cy={y} r="1.8" fill="none"
              strokeWidth=".5" className="stroke-accent" opacity="0" />
          ))}
          {NODES.map(([x, y], i) => (
            <g key={`m-${x}`} ref={(el) => { refs.current.markers[i] = el; }} opacity="0">
              <circle cx={x} cy={y} r="2.7" className="fill-accent stroke-white/80 [stroke-width:.4]" />
              <text x={x} y={y} dy=".35em" textAnchor="middle" className="fill-accent-ink text-[2.6px] font-bold">{i + 1}</text>
            </g>
          ))}

          {[0, 1, 2, 3, 4].map((k) => (
            <circle key={`t-${k}`} ref={(el) => { refs.current.trail[k] = el; }} cx="18" cy="52" r={1.1 - k * 0.12}
              className="fill-white" opacity="0" />
          ))}
          <circle ref={(el) => { refs.current.ball = el; }} cx="18" cy="52" r="1.15"
            className="fill-white stroke-black/60 [stroke-width:.25]" />

          {[0, 1].map((i) => (
            <circle key={`b-${i}`} ref={(el) => { refs.current.burst[i] = el; }} cx="116" cy="40" r="2" fill="none"
              strokeWidth=".7" className="stroke-accent" opacity="0" />
          ))}
          <g ref={(el) => { refs.current.goal = el; }} opacity="0">
            <rect x="86" y="12" width="24" height="7.5" rx="3.75" className="fill-accent" />
            <text x="98" y="17.1" textAnchor="middle" className="fill-accent-ink text-[3.2px] font-extrabold tracking-wider">GOAL</text>
          </g>

          {/* Evidence chips sit above y=68, clear of the hero card that overlaps the pitch's bottom edge */}
          {IDS.map((id, i) => (
            <g key={id} ref={(el) => { refs.current.ids[i] = el; }} opacity="0">
              <rect x={5 + i * 15} y="61.5" width="13.4" height="6" rx="3" className="fill-black/55" />
              <text x={5 + i * 15 + 6.7} y="65.7" textAnchor="middle" className="fill-white font-mono text-[2.8px]">{id}</text>
            </g>
          ))}
        </g>

        {/* Label chip */}
        <rect x="5" y="5" width="37" height="7.5" rx="3.75" className="fill-black/45" />
        <circle cx="9.3" cy="8.75" r="1.1" className="fill-accent" />
        <text x="12.2" y="9.9" className="fill-white text-[3px] font-semibold">9&apos; Counter-attack</text>
      </svg>

      {/* Pause and play. Hidden for reduced motion, which already gets the finished still. */}
      {!reduced && (
        <button
          type="button"
          onClick={toggle}
          aria-label={stopped ? "Play animation" : "Pause animation"}
          className="absolute right-1 top-1 grid size-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60">
            {stopped ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          </span>
        </button>
      )}
    </div>
  );
}