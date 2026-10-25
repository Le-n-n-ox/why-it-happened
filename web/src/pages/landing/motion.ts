// "Play when seen" classes. Use them inside a <Sequence>, which sets data-in="true" once seen.
// Every class is written out in full on purpose: Tailwind only generates classes it can read as literal text.
// Stagger with inline style, for example style={at(400)}.

export const FADE_UP =
  "opacity-0 translate-y-2 transition duration-500 ease-out group-data-[in=true]/seq:translate-y-0 group-data-[in=true]/seq:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none";

export const POP =
  "scale-0 transition-transform duration-500 ease-[cubic-bezier(.2,1.4,.4,1)] group-data-[in=true]/seq:scale-100 motion-reduce:scale-100 motion-reduce:transition-none";

export const GROW_X =
  "origin-left scale-x-0 transition-transform ease-out group-data-[in=true]/seq:scale-x-100 motion-reduce:scale-x-100 motion-reduce:transition-none";

export const GROW_Y =
  "origin-top scale-y-0 transition-transform ease-out group-data-[in=true]/seq:scale-y-100 motion-reduce:scale-y-100 motion-reduce:transition-none";

// SVG strokes: give the element pathLength={1}.
export const DRAW =
  "[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-1000 ease-out group-data-[in=true]/seq:[stroke-dashoffset:0] motion-reduce:[stroke-dashoffset:0] motion-reduce:transition-none";

// SVG shapes that scale or pulse need this to scale around their own centre.
export const ORIGIN = "[transform-box:fill-box] [transform-origin:center]";

export const at = (ms: number) => ({ transitionDelay: `${ms}ms` });