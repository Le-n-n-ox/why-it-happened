// web/src/pages/PlayerPage.tsx - one player: rating, breakdown, review, moments and actions with proof.
import { useState } from "react";

import { getPlayer } from "@/lib/api";
import { Button } from "@/components/Button";
import { Heatmap } from "@/components/Heatmap";
import { Loader } from "@/components/Loader";
import { eventsByIds, formatMinute, stripCitations, teamColor } from "@/lib/match";
import { useMatch } from "@/types/matchContext";
import { Pitch } from "@/components/Pitch";
import { formatRating, normalizePlayerDetail, prettyKey } from "@/lib/players";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ui } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";

interface Picked {
  ids: string[];
  label: string;
}

const MOMENT = "grid gap-2 rounded-card bg-surface-2 px-3.5 py-3";
const MOMENT_TEXT = "m-0 leading-snug";
const LIST = "m-0 grid list-none gap-2.5 p-0";

const round2 = (n: number): number => Math.round(n * 100) / 100;

function Evidence({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className={ui.chips}>
      {ids.map((e) => <span key={e} className={ui.chip}>{e}</span>)}
    </div>
  );
}

export function PlayerPage({ id }: { id: string }) {
  const { teams, byId, allEvents, lang } = useMatch();
  const { data, error, loading, retry } = useApi(getPlayer, id);
  const [picked, setPicked] = useState<Picked>({ ids: [], label: "" });

  const player = data === null ? null : normalizePlayerDetail(data);
  const selected = eventsByIds(picked.ids, byId);
  const show = (ids: string[], label: string) => setPicked({ ids, label });

  if (loading) {
    return (
      <section className={ui.page}>
        <a className={ui.link} href="#/players">← All players</a>
        <Loader label="Loading player" />
      </section>
    );
  }

  if (error !== null || player === null) {
    return (
      <section className={ui.page}>
        <a className={ui.link} href="#/players">← All players</a>
        <p role="alert" className="m-0 rounded-card bg-warn px-3.5 py-2.5 text-black">
          {error !== null ? `Couldn't load this player (${error}).` : "Couldn't read this player's data."}{" "}
          <Button className="border-black bg-white text-black hover:bg-white/80" onClick={retry}>Retry</Button>
        </p>
      </section>
    );
  }

  const color = teamColor(player.team, teams);
  const maxAbs = Math.max(1e-9, ...player.breakdown.map((b) => Math.abs(b.value)));
  const missing = picked.ids.length - selected.length;

  const allCited = eventsByIds(
    [...player.moments.flatMap((m) => m.evidence), ...player.actions.flatMap((a) => a.evidence)],
    byId,
  );

  return (
    <section className={ui.pageWide}>
      <a className={ui.link} href="#/players">← All players</a>
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className={ui.h2}>{player.name}</h2>
        <span className="font-bold" style={{ color }}>{player.team}</span>
        <span className="font-heading text-[1.8rem] font-bold tabular-nums" aria-label={`Rating ${formatRating(player.rating)}`}>
          {formatRating(player.rating)}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start gap-4 max-[1000px]:grid-cols-1">
        <div className="grid min-w-0 gap-4">
          {player.stats.length > 0 && (
            <dl className="m-0 flex flex-wrap gap-2.5">
              {player.stats.map((s) => (
                <div key={s.key} className="rounded-card border border-line bg-surface px-3.5 py-2">
                  <dt className="text-[.7rem] uppercase text-muted">{prettyKey(s.key)}</dt>
                  <dd className="m-0 font-bold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <section className={ui.panel} aria-label="Rating breakdown">
            <h3 className={ui.h3}>Rating breakdown</h3>
            {player.breakdown.length === 0 ? (
              <p className={ui.empty}>No breakdown available.</p>
            ) : (
              player.breakdown.map((b) => (
                <div key={b.label} className="grid grid-cols-[9rem_minmax(0,1fr)_5ch] items-center gap-2.5 text-[.9rem]">
                  <span>{b.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${b.label} ${round2(b.value)}`}>
                    <span
                      className="block h-full animate-meter-in rounded-[inherit]"
                      style={{
                        width: `${(Math.abs(b.value) / maxAbs) * 100}%`,
                        background: b.value >= 0 ? "var(--accent)" : "var(--warn)",
                      }}
                    />
                  </div>
                  <span className="text-right tabular-nums">{b.value > 0 ? `+${round2(b.value)}` : round2(b.value)}</span>
                </div>
              ))
            )}
          </section>

          <ReviewPanel id={player.id} lang={lang} onShow={show} />

          <section className={ui.panel} aria-label="Key moments">
            <h3 className={ui.h3}>Key moments</h3>
            {player.moments.length === 0 ? (
              <p className={ui.empty}>No key moments yet.</p>
            ) : (
              <ul className={LIST}>
                {player.moments.map((m, n) => (
                  <li key={`${n}-${m.text}`} className={MOMENT}>
                    <div className={ui.meta}>
                      {m.minute !== undefined && <span className={ui.minute}>{formatMinute(m.minute)}</span>}
                    </div>
                    <p className={MOMENT_TEXT}>{stripCitations(m.text)}</p>
                    <Evidence ids={m.evidence} />
                    <div className={ui.actions}>
                      {m.evidence.length > 0 && (
                        <Button onClick={() => show(m.evidence, "moment")}>Show on pitch</Button>
                      )}
                      {m.insightId !== undefined && (
                        <a className={ui.link} href={`#/insight/${encodeURIComponent(m.insightId)}`}>Open insight →</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={ui.panel} aria-label="Actions and why">
            <h3 className={ui.h3}>Actions, and why they mattered</h3>
            {player.actions.length === 0 ? (
              <p className={ui.empty}>No actions recorded yet.</p>
            ) : (
              <ul className={LIST}>
                {player.actions.map((a, n) => (
                  <li key={`${n}-${a.eventId ?? a.why}`} className={MOMENT}>
                    <div className={ui.meta}>
                      {a.minute !== undefined && <span className={ui.minute}>{formatMinute(a.minute)}</span>}
                      {a.type !== undefined && <span>{prettyKey(a.type)}</span>}
                    </div>
                    <p className={MOMENT_TEXT}>{a.why}</p>
                    <Evidence ids={a.evidence} />
                    <div className={ui.actions}>
                      {a.evidence.length > 0 && (
                        <Button onClick={() => show(a.evidence, a.type ?? "action")}>
                          Show on pitch
                        </Button>
                      )}
                      {a.insightId !== undefined && (
                        <a className={ui.link} href={`#/insight/${encodeURIComponent(a.insightId)}`}>Open insight →</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {teams.length > 0 && (
          <div className="sticky top-[90px] grid gap-2 max-[1000px]:static max-[1000px]:-order-1">
            <Heatmap events={allCited} teams={teams} />

            <Pitch events={allEvents} selected={selected} teams={teams} />
            <p className={ui.empty}>
              {picked.ids.length > 0
                ? `Showing: ${picked.label}${missing > 0 ? ` (${missing} cited event(s) not found in /events)` : ""}`
                : "Choose “Show on pitch” on a moment, action or the review."}
            </p>
            {picked.ids.length > 0 && (
              <div>
                <Button onClick={() => show([], "")}>Clear</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}