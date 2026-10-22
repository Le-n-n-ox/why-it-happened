// web/src/pages/InsightPage.tsx - one insight in full: pitch, narration, chain, players, facts, evidence.
import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ChainSteps } from "@/components/ChainSteps";
import { EventWhyCard } from "@/components/EventWhyCard";
import { Pitch } from "@/components/Pitch";
import { NameList, PlayerName } from "@/components/PlayerName";
import { useApi } from "@/hooks/useApi";
import { getInsightHistory, getPlayers } from "@/lib/api";
import {
  eventsByIds, evidenceEvents, formatMinute, isDisplayableFact, kindLabel, languageName, stripCitations, teamColor,
} from "@/lib/match";
import { playerNames } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { Insight, InsightRecord } from "@/types/types";

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
  const [saved, setSaved] = useState<{ id: string; record: InsightRecord | null } | null>(null);
  const insight = insights.find((i) => i.id === id);
  const players = playersState.data ?? [];

  // Not in the stream or the server's list: look in the saved history, so an old shared link opens.
  useEffect(() => {
    if (insight || saved?.id === id) return;
    let cancelled = false;
    getInsightHistory(undefined, 50)
      .then((records) => {
        if (!cancelled) setSaved({ id, record: records.find((r) => r.id === id) ?? null });
      })
      .catch(() => {
        if (!cancelled) setSaved({ id, record: null });
      });
    return () => { cancelled = true; };
  }, [id, insight, saved]);

  const record = saved?.id === id ? saved.record : null;
  const shown: Insight | null = insight ?? (record ? {
    id: record.id, kind: record.kind, team: record.team, minute: record.minute,
    evidence: record.evidence, facts: record.facts, narration: {},
  } : null);

  if (!shown) {
    const waiting = status === "connecting" || status === "live";
    const searched = saved?.id === id;
    return (
      <section className={ui.page}>
        <a className={ui.link} href="#/">← Back to live</a>
        <p className={ui.empty}>
          {waiting
            ? "Waiting for this insight..."
            : searched
              ? "This insight is in neither the live list nor the saved history. Try the History page, or press Replay to rebuild the list."
              : "Looking for this insight in the saved history..."}
        </p>
      </section>
    );
  }

  const evidence = evidenceEvents(shown, byId);
  const eventWhyIsInline = eventId !== null && evidence.some((event) => event.id === eventId);
  const selected = pinned ? eventsByIds(pinned, byId) : evidence;
  const skipped = shown.evidence.length - evidence.length;
  const color = teamColor(shown.team, teams);
  const starter = playerNames(shown.facts["starter"]);
  const finisher = playerNames(shown.facts["finisher"]);
  const involved = playerNames(shown.facts["players"]);
  const hasPlayers = starter.length + finisher.length + involved.length > 0;

  return (
    <section className={ui.page}>
      <a className={ui.link} href="#/">← Back to live</a>
      <h2 className={ui.h2}>
        <span className={ui.minute}>{formatMinute(shown.minute)}</span>{" "}
        <span style={{ color }}>{shown.team}</span> · {kindLabel(shown.kind)}
      </h2>

      {record && (
        <p className={ui.empty}>
          This insight came from the saved history, so only the narration written when the match was
          narrated is here.
        </p>
      )}

      <Pitch events={allEvents} selected={selected} teams={teams} onEventClick={setEventId} />
      {eventId !== null && !eventWhyIsInline && <EventWhyCard eventId={eventId} onClose={() => setEventId(null)} />}

      <h3 className={ui.h3}>Narration</h3>
      {record ? (
        <p className="m-0 leading-snug">{stripCitations(record.narration)}</p>
      ) : (
        <ul className="grid list-disc gap-1.5 pl-5">
          {Object.entries(shown.narration).map(([code, text]) => (
            <li key={code}>
              <strong>{languageName(code)}: </strong>
              <span lang={code}>{stripCitations(text)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={ui.chips}>
        {shown.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
      </div>

      {shown.chain && (
        <>
          <h3 className={ui.h3}>How it happened</h3>
          <div className="grid gap-2 rounded-card border border-line bg-surface p-3.5">
            <ChainSteps chain={shown.chain} />
            {shown.chain.summary && <p className="m-0 text-muted">{shown.chain.summary}</p>}
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
        {Object.entries(shown.facts)
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
              <Fragment key={e.id}>
                <tr>
                  <td className={ui.td}>{n + 1}</td>
                  <td className={`${ui.td} font-mono`}>{e.id}</td>
                  <td className={ui.td}>{e.team}</td>
                  <td className={ui.td}>{e.player ? <PlayerName name={e.player} players={players} /> : "-"}</td>
                  <td className={ui.td}>{e.type}</td>
                  <td className={ui.td}>{formatMinute(e.minute)}</td>
                  <td className={ui.td}>{e.outcome ?? "-"}</td>
                  <td className={ui.td}>
                    <Button aria-pressed={eventId === e.id} onClick={() => setEventId(eventId === e.id ? null : e.id)}>
                      {eventId === e.id ? "Hide" : "Why?"}
                    </Button>
                  </td>
                </tr>
                {eventId === e.id && (
                  <tr>
                    <td className={`${ui.td} bg-surface-2`} colSpan={8}>
                      <EventWhyCard eventId={e.id} onClose={() => setEventId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {skipped > 0 && <p className={ui.empty}>{skipped} cited event(s) were not found in /events.</p>}
    </section>
  );
}
