// web/src/pages/InsightPage.tsx - one insight in full: big pitch, every language, players, facts, evidence.
import { Fragment, useState } from "react";
import { getEventWhy, getPlayers } from "../api";
import {
  evidenceEvents, formatMinute, kindLabel, languageName, stripCitations, teamColor,
} from "../match";
import { useMatch } from "../matchContext";
import { Pitch } from "../Pitch";
import { NameList, PlayerName } from "../PlayerName";
import { normalizeAction, normalizePlayers, playerNames } from "../players";
import type { PlayerAction } from "../types";
import { useApi } from "../useApi";

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
  const skipped = insight.evidence.length - evidence.length;
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Id</th><th>Team</th><th>Player</th><th>Type</th><th>Minute</th>
              <th>x</th><th>y</th><th>Outcome</th><th>Why</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((e, n) => {
              const w = why[e.id];
              return (
                <Fragment key={e.id}>
                  <tr>
                    <td>{n + 1}</td><td>{e.id}</td><td>{e.team}</td>
                    <td>{e.player ? <PlayerName name={e.player} players={players} /> : "-"}</td>
                    <td>{e.type}</td><td>{formatMinute(e.minute)}</td><td>{e.x}</td><td>{e.y}</td>
                    <td>{e.outcome ?? "-"}</td>
                    <td>
                      <button type="button" onClick={() => askWhy(e.id)} disabled={w?.status === "loading"}>
                        {w === undefined ? "Why?" : w.status === "loading" ? "..." : "Hide"}
                      </button>
                    </td>
                  </tr>
                  {w !== undefined && w.status !== "loading" && (
                    <tr className="why-row">
                      <td colSpan={10}>
                        {w.status === "error" ? (
                          <span>Couldn't load the explanation for {e.id}.</span>
                        ) : w.action === null ? (
                          <span>No explanation available for {e.id}.</span>
                        ) : (
                          <div className="why">
                            <p className="why__text">{w.action.why}</p>
                            <div className="card__chips">
                              {w.action.evidence.map((x) => <span key={x} className="chip">{x}</span>)}
                            </div>
                            {w.action.insightId !== undefined && (
                              <a className="link" href={`#/insight/${encodeURIComponent(w.action.insightId)}`}>
                                Open insight →
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {skipped > 0 && <p className="empty">{skipped} cited event(s) were not found in /events.</p>}
    </section>
  );
}