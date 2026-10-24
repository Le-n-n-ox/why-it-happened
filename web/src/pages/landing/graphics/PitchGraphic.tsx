const PASSES: [string, number][] = [
  ["M18 52 Q34 40 50 44", 300],
  ["M50 44 Q66 30 82 34", 700],
  ["M82 34 L98 40", 1100],
];
const HOME: [number, number][] = [
  [22, 30], [34, 58], [46, 26], [58, 52], [70, 62], [76, 22], [88, 54], [94, 26],
];
const AWAY: [number, number][] = [
  [40, 40], [64, 34], [84, 46],
];

// 4 dark mow stripes of 14.5 units each, evenly interleaved across the 116-wide field.
const MOW_STRIPES = [2, 31, 60, 89];

/** Decorative pitch: faded events, a move drawing in, and a pulsing goal marker. */
export function PitchGraphic() {
  return (
    <svg
      viewBox="0 0 120 80"
      role="img"
      aria-label="Pitch showing a move that ends in a goal"
      className="w-full rounded-card border border-line bg-grass shadow-card"
    >
      <defs>
        {/* Edge darkening for depth — the only gradient we need */}
        <radialGradient id="pitchVignette" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity=".22" />
        </radialGradient>
      </defs>

      {/* Mow stripes (very subtle) + vignette, inside the touch line only */}
      {MOW_STRIPES.map((x) => (
        <rect key={x} x={x} y={2} width={14.5} height={76} fill="black" fillOpacity=".04" />
      ))}
      <rect x={2} y={2} width={116} height={76} fill="url(#pitchVignette)" />

      {/* Pitch markings — touch line heaviest, interior lines lighter */}
      <g fill="none" stroke="white" strokeWidth=".5">
        <rect x="2" y="2" width="116" height="76" strokeOpacity=".38" />
        <path d="M60 2v76" strokeOpacity=".38" />
        <circle cx="60" cy="40" r="10" strokeOpacity=".28" />
        <rect x="2" y="20" width="16" height="40" strokeOpacity=".28" />
        <rect x="102" y="20" width="16" height="40" strokeOpacity=".28" />
        <rect x="2" y="30" width="6" height="20" strokeOpacity=".22" />
        <rect x="112" y="30" width="6" height="20" strokeOpacity=".22" />
        {/* Corner arcs */}
        <path d="M2 6A4 4 0 0 1 6 2" strokeOpacity=".28" />
        <path d="M114 2A4 4 0 0 1 118 6" strokeOpacity=".28" />
        <path d="M2 74A4 4 0 0 0 6 78" strokeOpacity=".28" />
        <path d="M114 78A4 4 0 0 0 118 74" strokeOpacity=".28" />
      </g>
      <circle cx="60" cy="40" r=".6" fill="white" fillOpacity=".45" />

      {/* Player shadows first, then players — gives each dot a grounded feel */}
      <g fill="black" fillOpacity=".13">
        {HOME.map(([x, y]) => <circle key={`hs-${x}-${y}`} cx={x} cy={y} r="1.55" />)}
        {AWAY.map(([x, y]) => <circle key={`as-${x}-${y}`} cx={x} cy={y} r="1.55" />)}
      </g>
      {HOME.map(([x, y]) => (
        <circle key={`h-${x}-${y}`} cx={x} cy={y} r="1.3" className="fill-c1" opacity=".35" />
      ))}
      {AWAY.map(([x, y]) => (
        <circle key={`a-${x}-${y}`} cx={x} cy={y} r="1.3" className="fill-c2" opacity=".45" />
      ))}

      {/* Passes drawing in */}
      {PASSES.map(([d, delay]) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          fill="none"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="stroke-c1 dash-1 animate-draw anim-hold"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}

      {/* Final ball → goal: soft glow under a crisp line, both drawing in together */}
      <path
        d="M98 40 L117 40"
        pathLength={1}
        fill="none"
        strokeWidth="3.4"
        strokeOpacity=".2"
        strokeLinecap="round"
        className="stroke-accent dash-1 animate-draw anim-hold"
        style={{ animationDelay: "1500ms" }}
      />
      <path
        d="M98 40 L117 40"
        pathLength={1}
        fill="none"
        strokeWidth="1.2"
        strokeLinecap="round"
        className="stroke-accent dash-1 animate-draw anim-hold"
        style={{ animationDelay: "1500ms" }}
      />

      {/* Goal: soft two-step halo, pulsing ring, then the dot itself */}
      <circle cx="98" cy="40" r="5" className="fill-accent" opacity=".1" />
      <circle cx="98" cy="40" r="3.5" className="fill-accent" opacity=".18" />
      <circle
        cx="98"
        cy="40"
        r="2.4"
        fill="none"
        strokeWidth=".8"
        className="stroke-accent animate-ring anim-hold [transform-box:fill-box] [transform-origin:center]"
        style={{ animationDelay: "1500ms" }}
      />
      <circle cx="98" cy="40" r="2" className="fill-accent" />
    </svg>
  );
}