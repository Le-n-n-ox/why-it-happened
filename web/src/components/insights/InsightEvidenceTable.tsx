import { Fragment } from "react";
import { formatMinute } from "@/lib/match";
import { PlayerName } from "@/components/PlayerName";
import type { MatchEvent, PlayerAction, PlayerSummary } from "@/types/types";

type WhyState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; action: PlayerAction | null };

interface InsightEvidenceTableProps {
  evidence: MatchEvent[];
  players: PlayerSummary[];
  why: Partial<Record<string, WhyState>>;
  onAskWhy: (eventId: string) => void;
}

export function InsightEvidenceTable({ evidence, players, why, onAskWhy }: InsightEvidenceTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Id</th><th>Team</th><th>Player</th><th>Type</th><th>Minute</th><th>x</th><th>y</th><th>Outcome</th><th>Why</th></tr></thead>
        <tbody>
          {evidence.map((event, index) => {
            const current = why[event.id];
            return (
              <Fragment key={event.id}>
                <tr>
                  <td>{index + 1}</td><td>{event.id}</td><td>{event.team}</td>
                  <td>{event.player ? <PlayerName name={event.player} players={players} /> : "-"}</td>
                  <td>{event.type}</td><td>{formatMinute(event.minute)}</td><td>{event.x}</td><td>{event.y}</td>
                  <td>{event.outcome ?? "-"}</td>
                  <td>
                    <button type="button" onClick={() => onAskWhy(event.id)} disabled={current?.status === "loading"}>
                      {current === undefined ? "Why?" : current.status === "loading" ? "..." : "Hide"}
                    </button>
                  </td>
                </tr>
                {current !== undefined && current.status !== "loading" && (
                  <tr className="why-row">
                    <td colSpan={10}>
                      {current.status === "error" ? <span>Couldn't load the explanation for {event.id}.</span>
                        : current.action === null ? <span>No explanation available for {event.id}.</span>
                        : <div className="why">
                          <p className="why__text">{current.action.why}</p>
                          <div className="card__chips">{current.action.evidence.map((id) => <span key={id} className="chip">{id}</span>)}</div>
                          {current.action.insightId !== undefined && (
                            <a className="link" href={`#/insight/${encodeURIComponent(current.action.insightId)}`}>Open insight →</a>
                          )}
                        </div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
