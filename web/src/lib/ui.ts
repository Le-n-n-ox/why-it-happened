// web/src/lib/ui.ts - shared class strings, so the same look is not repeated in every file.
export const ui = {
  page: "mx-auto grid w-full max-w-[900px] gap-4",
  pageWide: "mx-auto grid w-full max-w-[1100px] gap-4",
  h2: "m-0 text-2xl font-bold",
  h3: "m-0 text-lg font-bold",
  panel: "grid content-start gap-2.5 rounded-card border border-line bg-surface p-4",
  empty: "text-muted",
  link: "text-accent underline-offset-2 hover:underline",
  meta: "flex gap-2.5 text-[.85rem] text-muted",
  minute: "font-bold text-accent",
  chips: "flex flex-wrap gap-1.5",
  chip: "rounded-full bg-bg px-2 py-px text-[.72rem] text-muted",
  tag: "ml-2 rounded bg-surface-2 px-1.5 py-px align-middle text-[.65rem] text-muted",
  actions: "flex flex-wrap items-center gap-2.5",
} as const;