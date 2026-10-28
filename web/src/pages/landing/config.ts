// Hash routing: keep "#/". Point these at real routes.
// "/" now renders the landing page, so the app lives at "/live".
export const APP_HREF = "#/live";
export const ABOUT_HREF = "#/about";
export const LANDING_HREF = "#/";
// Required credit when the feed is StatsBomb Open Data. Set to "" to hide it.
export const DATA_SOURCE = "StatsBomb Open Data";

export const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";

/**
 * Sticky nav height in px — must match LandingNav's `h-16` (64px).
 * Used to offset scroll targets so a section heading is not hidden under the header.
 */
export const NAV_OFFSET = 64;

/**
 * Scroll to a section by id, accounting for the sticky nav and the user's
 * reduced-motion preference.
 *
 * - Offsets by NAV_OFFSET so the section's `h2` lands just below the header.
 * - Respects `prefers-reduced-motion: reduce` (OS-level accessibility setting).
 */
export const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;

  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;

  window.scrollTo({
    top,
    behavior: prefersReduced ? "auto" : "smooth",
  });
};