
// web/src/App.tsx - wires everything together.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getEvents, getHealth } from "./api";
import { InsightCard } from "./InsightCard";
import { Pitch } from "./Pitch";
import { Recap } from "./Recap";
import {
  clockFromInsights, evidenceEvents, formatMinute, languageName, languagesFrom,
  scoreFrom, teamColor, teamsFrom,
} from "./match";
import type { MatchEvent } from "./types";
import { useMatchStream } from "./useMatchStream";

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

export default function App() {
  const { insights, ticks, status, replay } = useMatchStream(speed);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [healthLangs, setHealthLangs] = useState<string[]>([]);
  const [lang, setLang] = useState(initialLang);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [follow, setFollow] = useState(true); // auto-select the newest insight

  useEffect(() => {
    // all events: used for the pitch and the evidence drill-down
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

  // Live "tick" events if the backend sends them, otherwise a clock driven by the insights.
  const clock = ticks.length
    ? ticks[ticks.length - 1].minute
    : ended ? lastMinute : clockFromInsights(insights, byId);
  const shown = ticks.length ? ticks : allEvents.filter((e) => e.minute <= clock);
  const score = scoreFrom(shown, teams);

  const latestId = insights[0]?.id ?? null;
  useEffect(() => {
    if (follow && latestId) setSelectedId(latestId);
  }, [follow, latestId]);

  const selected = evidenceEvents(insights.find((i) => i.id === selectedId), byId);

  const handleSelect = useCallback((id: string) => {
    setFollow(false); // a manual choice stops auto-follow
    setSelectedId(id);
  }, []);

  const changeLang = (code: string) => {
    setLang(code);
    try { localStorage.setItem("lang", code); } catch { /* storage blocked: ignore */ }
  };

  const restart = () => {
    setSelectedId(null);
    setFollow(true);
    replay();
  };

  const [home, away] = teams;

  return (
    <main className="app">
      <header className="header">
        <h1>Why It Happened</h1>
        {away !== undefined && (
          <p className="scoreboard">
            <span className="scoreboard__team" style={{ color: teamColor(home, teams) }}>{home}</span>
            <span className="scoreboard__goals">{score[home]}</span>
            <span className="scoreboard__sep">-</span>
            <span className="scoreboard__goals">{score[away]}</span>
            <span className="scoreboard__team" style={{ color: teamColor(away, teams) }}>{away}</span>
            <span className="sr-only">{`Score: ${home} ${score[home]}, ${away} ${score[away]}`}</span>
          </p>
        )}
        <span className="clock">{ended ? "FT" : formatMinute(clock)}</span>
        <span className={`badge badge--${status}`}>{status}</span>
        <select value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Language">
          {languages.map((code) => (
            <option key={code} value={code}>{languageName(code)}</option>
          ))}
        </select>
        <button type="button" aria-pressed={follow} onClick={() => setFollow((f) => !f)}>
          Follow live: {follow ? "on" : "off"}
        </button>
        <button type="button" onClick={restart}>Replay</button>
      </header>

      {status === "error" && (
        <p role="alert" className="banner">
          Can't reach the match feed. Is the backend running?{" "}
          <button type="button" onClick={restart}>Retry</button>
        </p>
      )}
      {eventsFailed && status !== "error" && (
        <p role="alert" className="banner">
          Couldn't load match events, so the pitch is unavailable.{" "}
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </p>
      )}

      {teams.length > 0 && <Pitch events={shown} selected={selected} teams={teams} />}

      <section className="feed-panel" aria-live="polite" aria-label="Live insights">
        {insights.length === 0 && status !== "error" && (
          <p className="empty">Waiting for the first insight...</p>
        )}
        <ul className="feed">
          {insights.map((i) => (
            <InsightCard
              key={i.id}
              insight={i}
              lang={lang}
              color={teamColor(i.team, teams)}
              selected={i.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      </section>

      <Recap insights={insights} lang={lang} ended={ended} />
    </main>
  );
}
