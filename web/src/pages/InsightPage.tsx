// web/src/pages/InsightPage.tsx - one insight in full: big pitch, every language, players, facts, evidence.
import { useState } from "react";
import { InsightEvidenceTable } from "@/components/insights/InsightEvidenceTable";
import { getEventWhy, getPlayers } from "@/lib/api";
import {
  evidenceEvents, formatMinute, kindLabel, languageName, stripCitations, teamColor,
} from "@/lib/match";
import { useMatch } from "@/types/matchContext";
import { Pitch } from "@/components/Pitch";
import { NameList } from "@/components/PlayerName";
import { normalizeAction, normalizePlayers, playerNames } from "@/lib/players";
import type { PlayerAction } from "@/types/types";
import { useApi } from "@/hooks/useApi";

type WhyState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; action: PlayerAction | null };

const PLAYER_KEYS = new Set(["players", "starter", "finisher"]);

function formatFact(v: unknown): string {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" || typeof x === "number" ? String(x) : JSON.stringify(x)))
      .join(", ");
  }
  if (typeof v === "object" && v !== null) return JSON.stringify(v);
  return String(v);
}

export function InsightPage({ id }: { id: string }) {
  const { insights, byId, allEvents, teams, status } = useMatch();
  const playersState = useApi(getPlayers, "all");
  const [why, setWhy] = useState<Partial<Record<string, WhyState>>>({});
  const insight = insights.find((i) => i.id === id);
  const players = playersState.data === null ? [] : normalizePlayers(playersState.data);

  const askWhy = (eventId: string) => {
    const current = why[eventId];
    if (current !== undefined && current.status !== "loading") {
      // second click hides the explanation
      setWhy((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== eventId)));
      return;
    }
    setWhy((prev) => ({ ...prev, [eventId]: { status: "loading" } }));
    getEventWhy(eventId)
      .then((raw) => setWhy((prev) => ({ ...prev, [eventId]: { status: "ok", action: normalizeAction(raw) } })))
      .catch(() => setWhy((prev) => ({ ...prev, [eventId]: { status: "error" } })));
  };

  if (!insight) {
    const waiting = status === "connecting" || status === "live";
    return (
      <section className="page">
        <a className="link" href="#/">← Back to live</a>
        <p className="empty">
          {waiting
            ? "Waiting for this insight..."
            : "Insight not found. Press Replay to rebuild the list."}
        </p>
      </section>
    );
  }

  const evidence = evidenceEvents(insight, byId);
  const color = teamColor(insight.team, teams);
  const starter = playerNames(insight.facts["starter"]);
  const finisher = playerNames(insight.facts["finisher"]);
  const involved = playerNames(insight.facts["players"]);
  const hasPlayers = starter.length + finisher.length + involved.length > 0;

  return (
    <section className="page">
      <a className="link" href="#/">← Back to live</a>
      <h2>
        <span className="card__minute">{formatMinute(insight.minute)}</span>{" "}
        <span style={{ color }}>{insight.team}</span> · {kindLabel(insight.kind)}
      </h2>

      <Pitch events={allEvents} selected={evidence} teams={teams} />

      <h3>Narration</h3>
      <ul className="plain">
        {Object.entries(insight.narration).map(([code, text]) => (
          <li key={code}>
            <strong>{languageName(code)}: </strong>
            <span lang={code}>{stripCitations(text)}</span>
          </li>
        ))}
      </ul>

      {hasPlayers && (
        <>
          <h3>Players</h3>
          <dl className="facts">
            {starter.length > 0 && (
              <div>
                <dt>Started the move</dt>
                <dd><NameList names={starter} players={players} /></dd>
              </div>
            )}
            {finisher.length > 0 && (
              <div>
                <dt>Finished it</dt>
                <dd><NameList names={finisher} players={players} /></dd>
              </div>
            )}
            {involved.length > 0 && (
              <div>
                <dt>Involved</dt>
                <dd><NameList names={involved} players={players} /></dd>
              </div>
            )}
          </dl>
        </>
      )}

      <h3>Facts</h3>
      <dl className="facts">
        {Object.entries(insight.facts)
          .filter(([k]) => !PLAYER_KEYS.has(k))
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k.replace(/_/g, " ")}</dt>
              <dd>{formatFact(v)}</dd>
            </div>
          ))}
      </dl>

      <h3>Evidence</h3>
      <InsightEvidenceTable evidence={evidence} players={players} why={why} onAskWhy={askWhy} />
      {insight.evidence.length > evidence.length && (
        <p className="empty">{insight.evidence.length - evidence.length} cited event(s) were not found in /events.</p>
      )}
    </section>
  );
}