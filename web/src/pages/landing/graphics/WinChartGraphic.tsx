function Line({ d, cls, delay, on, dashed }: { d: string; cls: string; delay: number; on: boolean; dashed?: boolean }) {
  return (
    <path d={d} pathLength={1} fill="none" strokeWidth="2.2" strokeLinecap="round"
      strokeDasharray={dashed ? "0.03 0.03" : "1"}
      className={`${cls} ${on ? "animate-draw anim-hold" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }} />
  );
}

/** Example win probability lines. `on` starts the draw animation. */
export function WinChartGraphic({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 300 120" role="img" aria-label="Example win probability lines for home, draw and away" className="w-full">
      <g className="stroke-line" strokeWidth="1">
        {[20, 60, 100].map((y) => <path key={y} d={`M0 ${y}H300`} />)}
      </g>
      <path d="M170 6V114" className="stroke-muted" strokeDasharray="3 4" />
      <Line on={on} cls="stroke-c1" delay={0} d="M0 62 C60 60 120 58 170 70 S250 96 300 104" />
      <Line on={on} cls="stroke-c2" delay={250} d="M0 66 C60 70 120 72 170 50 S250 26 300 14" />
      <Line on={on} cls="stroke-muted" delay={500} dashed d="M0 94 C80 92 150 96 170 100 S250 104 300 108" />
      <circle cx="170" cy="60" r="4" className="fill-warn" />
    </svg>
  );
}