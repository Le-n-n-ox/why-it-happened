// web/src/MatchProvider.tsx - owns the stream, events, language and selection.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getEvents, getHealth } from "@/lib/api";
import { clockFromInsights, languagesFrom, scoreFrom, teamsFrom } from "@/lib/match";
import { MatchContext, type MatchState } from "@/types/matchContext";
import type { MatchEvent } from "@/types/types";
import { useMatchStream } from "@/hooks/useMatchStream";

// Demo mode: open /?speed=0.3&lang=sw (speed is ignored until the backend supports it)
const params = new URLSearchParams(window.location.search);
const speedParam = Number(params.get("speed"));
const speed = params.has("speed") && Number.isFinite(speedParam) ? speedParam : undefined;

function initialLang(): string {
  const fromUrl = params.get("lang");
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem("lang") ?? "en";
  } catch {
    return "en"; // storage can be blocked
  }
}

export function MatchProvider({ children }: { children: ReactNode }) {
  const { insights, ticks, status, replay } = useMatchStream(speed);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [healthLangs, setHealthLangs] = useState<string[]>([]);
  const [lang, setLang] = useState(initialLang);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    getEvents()
      .then((e) => { setAllEvents(e); setEventsFailed(false); })
      .catch(() => { setAllEvents([]); setEventsFailed(true); });
    getHealth().then((h) => setHealthLangs(h.languages)).catch(() => setHealthLangs([]));
  }, []);

  const teams = useMemo(() => teamsFrom(allEvents), [allEvents]);
  const byId = useMemo(() => new Map(allEvents.map((e) => [e.id, e])), [allEvents]);
  const languages = useMemo(
    () => languagesFrom(insights, [...healthLangs, lang]),
    [insights, healthLangs, lang],
  );

  const ended = status === "ended";
  const lastMinute = allEvents.length ? allEvents[allEvents.length - 1].minute : 0;
  const clock = ticks.length
    ? ticks[ticks.length - 1].minute
    : ended ? lastMinute : clockFromInsights(insights, byId);
  const shown = ticks.length ? ticks : allEvents.filter((e) => e.minute <= clock);
  const score = scoreFrom(shown, teams);

  const latestId = insights[0]?.id ?? null;
  useEffect(() => {
    if (follow && latestId) setSelectedId(latestId);
  }, [follow, latestId]);

  const select = useCallback((id: string) => {
    setFollow(false); // a manual choice stops auto-follow
    setSelectedId(id);
  }, []);

  const toggleFollow = useCallback(() => setFollow((f) => !f), []);

  const changeLang = useCallback((code: string) => {
    setLang(code);
    try { localStorage.setItem("lang", code); } catch { /* storage blocked: ignore */ }
  }, []);

  const restart = useCallback(() => {
    setSelectedId(null);
    setFollow(true);
    replay();
  }, [replay]);

  const value: MatchState = {
    insights, status, allEvents, eventsFailed, teams, byId, languages, lang, changeLang,
    clock, ended, shown, score, restart, follow, toggleFollow, selectedId, select,
  };

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}