// Hash routing: keep "#/". Point these at real routes.
export const APP_HREF = "#/";
export const ABOUT_HREF = "#/about";
// Required credit when the feed is StatsBomb Open Data. Set to "" to hide it.
export const DATA_SOURCE = "StatsBomb Open Data";

export const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";
export const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });