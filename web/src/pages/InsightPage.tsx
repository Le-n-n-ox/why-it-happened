// web/src/pages/InsightPage.tsx - one insight in full: pitch, narration, chain, players, facts, evidence.
import { useState } from "react";
import { Button } from "@/components/Button";
import { ChainSteps } from "@/components/ChainSteps";
import { EventWhyCard } from "@/components/EventWhyCard";
import { Pitch } from "@/components/Pitch";
import { NameList, PlayerName } from "@/components/PlayerName";
import { useApi } from "@/hooks/useApi";
import { getPlayers } from "@/lib/api";
import {
  eventsByIds, evidenceEvents, formatMinute, isDisplayableFact, kindLabel, languageName, stripCitations, teamColor,
} from "@/lib/match";
import { playerNames } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const PLAYER_KEYS = new Set(["players", "starter", "finisher"]);

function formatFact(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  if (typeof v === "object" && v !== null) return JSON.stringify(v);
  return String(v);
}

export function InsightPage({ id }: { id: string }) {
  const { insights, byId, allEvents, teams, status, pinned } = useMatch();
  const playersState = useApi(getPlayers, "all");
  const [eventId, setEventId] = useState<string | null>(null);
  const insight = insights.find((i) => i.id === id);
  const players = playersState.data ?? [];

  if (!insight) {
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
  const selected = pinned ? eventsByIds(pinned, byId) : evidence;
  const skipped = insight.evidence.length - evidence.length;
  const color = teamColor(insight.team, teams);
  const starter = playerNames(insight.facts["starter"]);
  const finisher = playerNames(insight.facts["finisher"]);
  const involved = playerNames(insight.facts["players"]);
  const hasPlayers = starter.length + finisher.length + involved.length > 0;

  return (
    <section className={ui.page}>
      <a className={ui.link} href="#/">← Back to live</a>
      <h2 className={ui.h2}>
        <span className={ui.minute}>{formatMinute(insight.minute)}</span>{" "}
        <span style={{ color }}>{insight.team}</span> · {kindLabel(insight.kind)}
      </h2>

      <Pitch events={allEvents} selected={selected} teams={teams} onEventClick={setEventId} />
      {eventId !== null && <EventWhyCard eventId={eventId} onClose={() => setEventId(null)} />}

      <h3 className={ui.h3}>Narration</h3>
      <ul className="grid list-disc gap-1.5 pl-5">
        {Object.entries(insight.narration).map(([code, text]) => (
          <li key={code}>
            <strong>{languageName(code)}: </strong>
            <span lang={code}>{stripCitations(text)}</span>
          </li>
        ))}
      </ul>
      <div className={ui.chips}>
        {insight.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
      </div>

      {insight.chain && (
        <>
          <h3 className={ui.h3}>How it happened</h3>
          <div className="grid gap-2 rounded-card border border-line bg-surface p-3.5">
            <ChainSteps chain={insight.chain} />
            {insight.chain.summary && <p className="m-0 text-muted">{insight.chain.summary}</p>}
          </div>
        </>
      )}

      {hasPlayers && (
        <>
          <h3 className={ui.h3}>Players</h3>
          <dl className="m-0 flex flex-wrap gap-2.5">
            {[
              ["Started the move", starter],
              ["Finished it", finisher],
              ["Involved", involved],
            ].map(([label, names]) =>
              names.length > 0 ? (
                <div key={label as string} className="rounded-card border border-line bg-surface px-3.5 py-2">
                  <dt className="text-[.7rem] text-muted uppercase">{label as string}</dt>
                  <dd className="m-0 font-bold"><NameList names={names as string[]} players={players} /></dd>
                </div>
              ) : null,
            )}
          </dl>
        </>
      )}

      <h3 className={ui.h3}>Facts</h3>
      <dl className="m-0 flex flex-wrap gap-2.5">
        {Object.entries(insight.facts)
          .filter(([k]) => !PLAYER_KEYS.has(k) && isDisplayableFact(k))
          .map(([k, v]) => (
            <div key={k} className="rounded-card border border-line bg-surface px-3.5 py-2">
              <dt className="text-[.7rem] text-muted uppercase">{k.replace(/_/g, " ")}</dt>
              <dd className="m-0 font-bold tabular-nums">{formatFact(v)}</dd>
            </div>
          ))}
      </dl>

      <h3 className={ui.h3}>Evidence</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[.85rem]">
          <thead>
            <tr>
              {["#", "Id", "Team", "Player", "Type", "Minute", "Outcome", "Why"].map((h) => (
                <th key={h} className={ui.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evidence.map((e, n) => (
              <tr key={e.id}>
                <td className={ui.td}>{n + 1}</td>
                <td className={`${ui.td} font-mono`}>{e.id}</td>
                <td className={ui.td}>{e.team}</td>
                <td className={ui.td}>{e.player ? <PlayerName name={e.player} players={players} /> : "-"}</td>
                <td className={ui.td}>{e.type}</td>
                <td className={ui.td}>{formatMinute(e.minute)}</td>
                <td className={ui.td}>{e.outcome ?? "-"}</td>
                <td className={ui.td}>
                  <Button aria-pressed={eventId === e.id} onClick={() => setEventId(eventId === e.id ? null : e.id)}>
                    Why?
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {skipped > 0 && <p className={ui.empty}>{skipped} cited event(s) were not found in /events.</p>}
    </section>
  );
}