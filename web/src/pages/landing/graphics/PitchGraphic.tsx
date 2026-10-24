const PASSES: [string, number][] = [
  ["M18 52 Q34 40 50 44", 300],
  ["M50 44 Q66 30 82 34", 700],
  ["M82 34 L98 40", 1100],
];
const HOME = [[22, 30], [34, 58], [46, 26], [58, 52], [70, 62], [76, 22], [88, 54], [94, 26]];
const AWAY = [[40, 40], [64, 34], [84, 46]];

/** Decorative pitch: faded events, a move drawing in, and a pulsing goal marker. */
export function PitchGraphic() {
  return (
    <svg viewBox="0 0 120 80" role="img" aria-label="Pitch showing a move that ends in a goal" className="w-full rounded-card border border-line bg-grass shadow-card">
      <g fill="none" stroke="white" strokeOpacity=".3" strokeWidth=".5">
        <rect x="2" y="2" width="116" height="76" />
        <path d="M60 2v76" />
        <circle cx="60" cy="40" r="10" />
        <rect x="2" y="20" width="16" height="40" />
        <rect x="102" y="20" width="16" height="40" />
        <rect x="2" y="30" width="6" height="20" />
        <rect x="112" y="30" width="6" height="20" />
      </g>
      {HOME.map(([x, y]) => <circle key={`h${x}`} cx={x} cy={y} r="1.3" className="fill-c1" opacity=".3" />)}
      {AWAY.map(([x, y]) => <circle key={`a${x}`} cx={x} cy={y} r="1.3" className="fill-c2" opacity=".4" />)}
      {PASSES.map(([d, delay]) => (
        <path key={d} d={d} pathLength={1} fill="none" strokeWidth="1.2" strokeLinecap="round"
          className="stroke-c1 dash-1 animate-draw anim-hold" style={{ animationDelay: `${delay}ms` }} />
      ))}
      <path d="M98 40 L117 40" pathLength={1} fill="none" strokeWidth="1.2"
        className="stroke-accent dash-1 animate-draw anim-hold" style={{ animationDelay: "1500ms" }} />
      <circle cx="98" cy="40" r="2.4" fill="none" strokeWidth=".8"
        className="stroke-accent animate-ring anim-hold [transform-box:fill-box] [transform-origin:center]" style={{ animationDelay: "1500ms" }} />
      <circle cx="98" cy="40" r="2" className="fill-accent" />
    </svg>
  );
}