import { useState } from "react";
import { InsightEvidenceTable } from "@/components/insights/InsightEvidenceTable";
import { NameList } from "@/components/PlayerName";
import { Pitch } from "@/components/Pitch";
import { getEventWhy, getPlayers } from "@/lib/api";
import { evidenceEvents, formatMinute, kindLabel, languageName, stripCitations, teamColor } from "@/lib/match";
import { normalizeAction, normalizePlayers, playerNames } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useMatch } from "@/types/matchContext";
import type { PlayerAction } from "@/types/types";

type WhyState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; action: PlayerAction | null };

const PLAYER_KEYS = new Set(["players", "starter", "finisher"]);

const FACTS = "m-0 flex flex-wrap gap-2.5";
const FACT = "rounded-card border border-line bg-surface px-3.5 py-2";
const DT = "text-[.7rem] uppercase text-muted";
const DD = "m-0 font-bold tabular-nums";

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
    return (
      <section className={ui.page}>
        <a className={ui.link} href="#/">← Back to live</a>
        <p className={ui.empty}>
          {waiting ? "Waiting for this insight..." : "Insight not found. Press Replay to rebuild the list."}
        </p>
      </section>
    );
  }

  const evidence = evidenceEvents(insight, byId);
  const color = teamColor(insight.team, teams);
  const starter = playerNames(insight.facts["starter"]);
  const finisher = playerNames(insight.facts["finisher"]);
  const involved = playerNames(insight.facts["players"]);

  return (
    <section className={ui.page}>
      <a className={ui.link} href="#/">← Back to live</a>
      <h2 className={ui.h2}>
        <span className={ui.minute}>{formatMinute(insight.minute)}</span>{" "}
        <span style={{ color }}>{insight.team}</span> · {kindLabel(insight.kind)}
      </h2>
      <Pitch events={allEvents} selected={evidence} teams={teams} />
      <h3 className={ui.h3}>Narration</h3>
      <ul className="m-0 grid list-disc gap-1.5 pl-5">
        {Object.entries(insight.narration).map(([code, text]) => (
          <li key={code}>
            <strong>{languageName(code)}: </strong>
            <span lang={code}>{stripCitations(text)}</span>
          </li>
        ))}
      </ul>
      {(starter.length + finisher.length + involved.length > 0) && (
        <>
          <h3 className={ui.h3}>Players</h3>
          <dl className={FACTS}>
            {starter.length > 0 && (
              <div className={FACT}>
                <dt className={DT}>Started the move</dt>
                <dd className={DD}><NameList names={starter} players={players} /></dd>
              </div>
            )}
            {finisher.length > 0 && (
              <div className={FACT}>
                <dt className={DT}>Finished it</dt>
                <dd className={DD}><NameList names={finisher} players={players} /></dd>
              </div>
            )}
            {involved.length > 0 && (
              <div className={FACT}>
                <dt className={DT}>Involved</dt>
                <dd className={DD}><NameList names={involved} players={players} /></dd>
              </div>
            )}
          </dl>
        </>
      )}
      <h3 className={ui.h3}>Facts</h3>
      <dl className={FACTS}>
        {Object.entries(insight.facts)
          .filter(([key]) => !PLAYER_KEYS.has(key))
          .map(([key, value]) => (
            <div key={key} className={FACT}>
              <dt className={DT}>{key.replace(/_/g, " ")}</dt>
              <dd className={DD}>{formatFact(value)}</dd>
            </div>
          ))}
      </dl>
      <h3 className={ui.h3}>Evidence</h3>
      <InsightEvidenceTable evidence={evidence} players={players} why={why} onAskWhy={askWhy} />
      {insight.evidence.length > evidence.length && (
        <p className={ui.empty}>{insight.evidence.length - evidence.length} cited event(s) were not found in /events.</p>
      )}
    </section>
  );
}