// web/src/app/MatchProvider.tsx - owns the stream, /match, /health, language and selection.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMatchStream } from "@/hooks/useMatchStream";
import { getEvents, getHealth, getInsights, getMatch } from "@/lib/api";
import { languagesFrom, teamsFrom } from "@/lib/match";
import { MatchContext, type MatchState } from "@/types/matchContext";
import type { Health, Insight, MatchEvent, MatchInfo, ViewerProfile } from "@/types/types";

// Demo mode: open /?speed=0.3&lang=en. /?source=live follows a match pushed in by a feed.
const params = new URLSearchParams(window.location.search);
const speedParam = Number(params.get("speed"));
const speed = params.has("speed") && Number.isFinite(speedParam) ? speedParam : undefined;
const source = params.get("source") === "live" ? "live" : undefined;

function initialLang(): string {
  const fromUrl = params.get("lang");
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem("lang") ?? "en";
  } catch {
    return "en"; // storage can be blocked
  }
}

const MODES: ViewerProfile["mode"][] = ["fan", "analyst", "announcer", "player"];

/** The viewer's profile survives a reload; an old fans-page favourite is migrated once. */
function initialProfile(): ViewerProfile {
  try {
    const raw = localStorage.getItem("viewerProfile");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ViewerProfile>;
      const mode = MODES.includes(parsed.mode as ViewerProfile["mode"]) ? parsed.mode! : "fan";
      return {
        mode,
        clubs: Array.isArray(parsed.clubs) ? parsed.clubs.filter((c): c is string => typeof c === "string") : [],
        players: Array.isArray(parsed.players)
          ? parsed.players.filter((p): p is string => typeof p === "string") : [],
        metric: typeof parsed.metric === "string" ? parsed.metric : null,
      };
    }
  } catch {
    // storage blocked or bad JSON: start clean
  }
  try {
    const fav = localStorage.getItem("fav");
    if (fav && fav !== "all") return { mode: "fan", clubs: [fav], players: [], metric: null };
  } catch {
    // ignore
  }
  return { mode: "fan", clubs: [], players: [], metric: null };
}

export function MatchProvider({ children }: { children: ReactNode }) {
  const { insights: streamInsights, ticks, predictions, status, replay } = useMatchStream(speed, source);
  const [serverInsights, setServerInsights] = useState<Insight[]>([]);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [lang, setLang] = useState(initialLang);
  const [profile, setProfileState] = useState<ViewerProfile>(initialProfile);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const [pinned, setPinned] = useState<string[] | null>(null);

  const refreshMatch = useCallback(() => {
    getMatch().then(setMatch).catch(() => setMatch(null));
  }, []);

  useEffect(() => {
    getEvents()
      .then((e) => { setAllEvents(e); setEventsFailed(false); })
      .catch(() => { setAllEvents([]); setEventsFailed(true); });
    getHealth().then(setHealth).catch(() => setHealth(null));
    // The insights the server already has, so a shared link resolves before the match replays.
    getInsights().then(setServerInsights).catch(() => setServerInsights([]));
    refreshMatch();
  }, [refreshMatch]);

  // The live stream wins for an id both know: it carries the freshest narration.
  const insights = useMemo(() => {
    const byId = new Map(serverInsights.map((i) => [i.id, i]));
    for (const insight of streamInsights) byId.set(insight.id, insight);
    return [...byId.values()].sort((a, b) => b.minute - a.minute || a.id.localeCompare(b.id));
  }, [serverInsights, streamInsights]);

  const ended = status === "ended";
  const lastTick = ticks.length ? ticks[ticks.length - 1] : null;

  // Refresh match metadata at full time. The displayed score is derived from goals seen in the stream.
  useEffect(() => {
    if (ended) refreshMatch();
  }, [ended, refreshMatch]);

  // A pinned highlight belongs to the page it was made on.
  useEffect(() => {
    const clear = () => setPinned(null);
    window.addEventListener("hashchange", clear);
    return () => window.removeEventListener("hashchange", clear);
  }, []);

  const events = allEvents.length ? allEvents : ticks;
  const teams = match?.home && match.away ? [match.home, match.away] : teamsFrom(events);
  const byId = useMemo(() => new Map([...allEvents, ...ticks].map((e) => [e.id, e])), [allEvents, ticks]);
  const languages = useMemo(
    () => languagesFrom(insights, [...(health?.languages ?? []), lang]),
    [insights, health, lang],
  );

  const score = useMemo(() => {
    if (teams.length < 2) return null;
    const current: Record<string, number> = Object.fromEntries(teams.map((team) => [team, 0]));
    const seenGoals = new Set<string>();
    for (const event of ticks) {
      if (event.type !== "goal" || seenGoals.has(event.id)) continue;
      seenGoals.add(event.id);
      if (event.team in current) current[event.team] += 1;
    }
    return current;
  }, [teams, ticks]);
  const clock = lastTick ? lastTick.minute : 0;

  const latestId = insights[0]?.id ?? null;
  useEffect(() => {
    if (follow && latestId) setSelectedId(latestId);
  }, [follow, latestId]);

  const select = useCallback((id: string) => {
    setFollow(false); // a manual choice stops auto-follow
    setPinned(null);
    setSelectedId(id);
  }, []);

  const toggleFollow = useCallback(() => setFollow((f) => !f), []);
  const pin = useCallback((ids: string[] | null) => setPinned(ids && ids.length > 0 ? ids : null), []);

  const changeLang = useCallback((code: string) => {
    setLang(code);
    try { localStorage.setItem("lang", code); } catch { /* storage blocked: ignore */ }
  }, []);

  const setProfile = useCallback((next: Partial<ViewerProfile>) => {
    setProfileState((prev) => {
      const value: ViewerProfile = { ...prev, ...next };
      try { localStorage.setItem("viewerProfile", JSON.stringify(value)); } catch { /* ignore */ }
      return value;
    });
  }, []);

  const restart = useCallback(() => {
    setSelectedId(null);
    setFollow(true);
    setPinned(null);
    replay();
    refreshMatch();
  }, [replay, refreshMatch]);

 const value: MatchState = {
  insights, status, allEvents, eventsFailed, teams, byId, shown: ticks, predictions, ball: lastTick, health, match, score,
  languages, lang, changeLang, clock, ended, restart, follow, toggleFollow, selectedId, select, pinned, pin,
  profile, setProfile,
};

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}
