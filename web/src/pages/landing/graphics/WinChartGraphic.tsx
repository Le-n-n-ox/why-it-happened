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
  // Paths unchanged so the draw animation timing stays identical.
  const homePath = "M0 62 C60 60 120 58 170 70 S250 96 300 104";
  const awayPath = "M0 66 C60 70 120 72 170 50 S250 26 300 14";
  const drawPath = "M0 94 C80 92 150 96 170 100 S250 104 300 108";

  // Line Y-position at the "now" marker (x=170) and at the right edge (x=300).
  // Derived from the C/S command endpoints in each path above.
  const nowY = { home: 70, away: 50, draw: 100 };
  const endY = { home: 104, away: 14, draw: 108 };

  return (
    <svg viewBox="0 0 300 120" role="img" aria-label="Example win probability lines for home, draw and away" className="w-full">
      {/* Grid — thinner and lighter than before, so the lines stay the hero */}
      <g className="stroke-line" strokeWidth="0.6" strokeOpacity="0.6">
        {[20, 60, 100].map((y) => <path key={y} d={`M0 ${y}H300`} strokeDasharray="2 4" />)}
      </g>

      {/* "Now" divider — dashed so it recedes against the solid team lines */}
      <path d="M170 6V114" className="stroke-muted" strokeDasharray="3 4" strokeOpacity=".7" />

      {/* Team lines — animation unchanged */}
      <Line on={on} cls="stroke-c1" delay={0} d={homePath} />
      <Line on={on} cls="stroke-c2" delay={250} d={awayPath} />
      <Line on={on} cls="stroke-muted" delay={500} dashed d={drawPath} />

      {/* End-of-line dots — resolves which line is which at a glance */}
      <g
        className={on ? "animate-page-in anim-hold" : "opacity-0"}
        style={{ animationDelay: "2100ms" }}
      >
        <circle cx="300" cy={endY.home} r="2.4" className="fill-c1" />
        <circle cx="300" cy={endY.away} r="2.4" className="fill-c2" />
        <circle cx="300" cy={endY.draw} r="2" className="fill-muted" />
      </g>

      {/* "Now" markers — one dot per line, pulse on the leader (away, highest) */}
      <g
        className={on ? "animate-page-in anim-hold" : "opacity-0"}
        style={{ animationDelay: "1700ms" }}
      >
        {/* Trailing markers first so the leader's pulse sits on top */}
        <circle cx="170" cy={nowY.home} r="2" className="fill-c1" />
        <circle cx="170" cy={nowY.draw} r="1.6" className="fill-muted" />

        {/* Leader: soft halo + pulse ring + solid dot */}
        <circle cx="170" cy={nowY.away} r="5" className="fill-accent" opacity=".12" />
        <circle
          cx="170"
          cy={nowY.away}
          r="3"
          fill="none"
          strokeWidth="1"
          className="stroke-accent animate-ring anim-hold [transform-box:fill-box] [transform-origin:center]"
          style={{ animationDelay: "1800ms" }}
        />
        <circle cx="170" cy={nowY.away} r="2.4" className="fill-accent" />
      </g>
    </svg>
  );
}