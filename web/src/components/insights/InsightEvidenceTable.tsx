import { Fragment } from "react";
import { Button } from "@/components/Button";
import { formatMinute } from "@/lib/match";
import { PlayerName } from "@/components/PlayerName";
import { ui } from "@/lib/ui";
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

const TH = "border-b border-line px-2.5 py-1.5 text-left font-semibold text-muted";
const TD = "border-b border-line px-2.5 py-1.5 text-left";

export function InsightEvidenceTable({ evidence, players, why, onAskWhy }: InsightEvidenceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[.85rem]">
        <thead>
          <tr>
            <th className={TH}>#</th>
            <th className={TH}>Id</th>
            <th className={TH}>Team</th>
            <th className={TH}>Player</th>
            <th className={TH}>Type</th>
            <th className={TH}>Minute</th>
            <th className={TH}>x</th>
            <th className={TH}>y</th>
            <th className={TH}>Outcome</th>
            <th className={TH}>Why</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((event, index) => {
            const current = why[event.id];
            return (
              <Fragment key={event.id}>
                <tr>
                  <td className={TD}>{index + 1}</td>
                  <td className={TD}>{event.id}</td>
                  <td className={TD}>{event.team}</td>
                  <td className={TD}>
                    {event.player ? <PlayerName name={event.player} players={players} /> : "-"}
                  </td>
                  <td className={TD}>{event.type}</td>
                  <td className={TD}>{formatMinute(event.minute)}</td>
                  <td className={TD}>{event.x}</td>
                  <td className={TD}>{event.y}</td>
                  <td className={TD}>{event.outcome ?? "-"}</td>
                  <td className={TD}>
                    <Button onClick={() => onAskWhy(event.id)} disabled={current?.status === "loading"}>
                      {current === undefined ? "Why?" : current.status === "loading" ? "..." : "Hide"}
                    </Button>
                  </td>
                </tr>
                {current !== undefined && current.status !== "loading" && (
                  <tr>
                    <td className={`${TD} bg-surface-2`} colSpan={10}>
                      {current.status === "error" ? (
                        <span>Couldn't load the explanation for {event.id}.</span>
                      ) : current.action === null ? (
                        <span>No explanation available for {event.id}.</span>
                      ) : (
                        <div className="grid gap-1.5">
                          <p className="m-0">{current.action.why}</p>
                          <div className={ui.chips}>
                            {current.action.evidence.map((id) => (
                              <span key={id} className={ui.chip}>{id}</span>
                            ))}
                          </div>
                          {current.action.insightId !== undefined && (
                            <a className={ui.link} href={`#/insight/${encodeURIComponent(current.action.insightId)}`}>
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
  );
}