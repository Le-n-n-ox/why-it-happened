// web/src/lib/titles.ts - the browser tab title for each hash route.
// Hash routing gives every tab the same title, so the page name is added here.
const APP = "Why It Happened";

/** "12' Reds counter-attack" for an insight, "Reds" for a team, and the plain name for the rest. */
export function pageTitle(path: string): string {
  const p = path.split("?")[0];
  if (p.startsWith("/insight/")) return `Insight · ${APP}`;
  if (p.startsWith("/team/")) return `${decode(p.slice("/team/".length))} · ${APP}`;
  if (p.startsWith("/player/")) return `${decode(p.slice("/player/".length))} · ${APP}`;
  const names: Record<string, string> = {
    "/": "Live",
    "/result": "Why the result",
    "/recap": "Timeline",
    "/ask": "Ask the match",
    "/positions": "Positions",
    "/teams": "Teams",
    "/players": "Players",
    "/fouls": "Fouls",
    "/analytics": "Analytics",
    "/announcers": "Announcers",
    "/fans": "Fans",
    "/history": "History",
    "/about": "How it works",
  };
  return `${names[p] ?? APP} · ${APP}`;
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
