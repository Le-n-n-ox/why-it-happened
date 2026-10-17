import { useState } from "react";
import { InsightEvidenceTable } from "@/components/insights/InsightEvidenceTable";
import { NameList } from "@/components/PlayerName";
import { Pitch } from "@/components/Pitch";
import { getEventWhy, getPlayers } from "@/lib/api";
import { evidenceEvents, formatMinute, kindLabel, languageName, stripCitations, teamColor } from "@/lib/match";
import { normalizeAction, normalizePlayers, playerNames } from "@/lib/players";
import { useApi } from "@/hooks/useApi";
import { useMatch } from "@/types/matchContext";
import type { PlayerAction } from "@/types/types";

type WhyState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; action: PlayerAction | null };

const PLAYER_KEYS = new Set(["players", "starter", "finisher"]);

function formatFact(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" || typeof item === "number" ? String(item) : JSON.stringify(item)).join(", ");
  }
  return typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

export function InsightPage({ id }: { id: string }) {
  const { insights, byId, allEvents, teams, status } = useMatch();
  const playersState = useApi(getPlayers, "all");
  const [why, setWhy] = useState<Partial<Record<string, WhyState>>>({});
  const insight = insights.find((item) => item.id === id);
  const players = playersState.data === null ? [] : normalizePlayers(playersState.data);

  const askWhy = (eventId: string) => {
    const current = why[eventId];
    if (current !== undefined && current.status !== "loading") {
      setWhy((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== eventId)));
      return;
    }
    setWhy((previous) => ({ ...previous, [eventId]: { status: "loading" } }));
    getEventWhy(eventId)
      .then((raw) => setWhy((previous) => ({ ...previous, [eventId]: { status: "ok", action: normalizeAction(raw) } })))
      .catch(() => setWhy((previous) => ({ ...previous, [eventId]: { status: "error" } })));
  };

  if (insight === undefined) {
    const waiting = status === "connecting" || status === "live";
    return <section className="page"><a className="link" href="#/">← Back to live</a><p className="empty">{waiting ? "Waiting for this insight..." : "Insight not found. Press Replay to rebuild the list."}</p></section>;
  }

  const evidence = evidenceEvents(insight, byId);
  const color = teamColor(insight.team, teams);
  const starter = playerNames(insight.facts["starter"]);
  const finisher = playerNames(insight.facts["finisher"]);
  const involved = playerNames(insight.facts["players"]);

  return (
    <section className="page">
      <a className="link" href="#/">← Back to live</a>
      <h2><span className="card__minute">{formatMinute(insight.minute)}</span>{" "}<span style={{ color }}>{insight.team}</span> · {kindLabel(insight.kind)}</h2>
      <Pitch events={allEvents} selected={evidence} teams={teams} />
      <h3>Narration</h3>
      <ul className="plain">{Object.entries(insight.narration).map(([code, text]) => <li key={code}><strong>{languageName(code)}: </strong><span lang={code}>{stripCitations(text)}</span></li>)}</ul>
      {(starter.length + finisher.length + involved.length > 0) && (
        <>
          <h3>Players</h3>
          <dl className="facts">
            {starter.length > 0 && <div><dt>Started the move</dt><dd><NameList names={starter} players={players} /></dd></div>}
            {finisher.length > 0 && <div><dt>Finished it</dt><dd><NameList names={finisher} players={players} /></dd></div>}
            {involved.length > 0 && <div><dt>Involved</dt><dd><NameList names={involved} players={players} /></dd></div>}
          </dl>
        </>
      )}
      <h3>Facts</h3>
      <dl className="facts">{Object.entries(insight.facts).filter(([key]) => !PLAYER_KEYS.has(key)).map(([key, value]) => <div key={key}><dt>{key.replace(/_/g, " ")}</dt><dd>{formatFact(value)}</dd></div>)}</dl>
      <h3>Evidence</h3>
      <InsightEvidenceTable evidence={evidence} players={players} why={why} onAskWhy={askWhy} />
      {insight.evidence.length > evidence.length && <p className="empty">{insight.evidence.length - evidence.length} cited event(s) were not found in /events.</p>}
    </section>
  );
}
