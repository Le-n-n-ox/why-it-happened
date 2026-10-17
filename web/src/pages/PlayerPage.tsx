// web/src/pages/PlayerPage.tsx - one player: rating, breakdown, review, moments and actions with proof.
import { useState } from "react";

import { getPlayer } from "@/lib/api";
import { Heatmap } from "@/components/Heatmap";
import { Loader } from "@/components/Loader";
import { eventsByIds, formatMinute, stripCitations, teamColor } from "@/lib/match";
import { useMatch } from "@/types/matchContext";
import { Pitch } from "@/components/Pitch";
import { formatRating, normalizePlayerDetail, prettyKey } from "@/lib/players";
import { ReviewPanel } from "@/components/ReviewPanel";
import { useApi } from "@/hooks/useApi";
interface Picked {
  ids: string[];
  label: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function Evidence({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="card__chips">
      {ids.map((e) => <span key={e} className="chip">{e}</span>)}
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
      <section className="page">
        <a className="link" href="#/players">← All players</a>
        <Loader label="Loading player" />
      </section>
    );
  }

  if (error !== null || player === null) {
    return (
      <section className="page">
        <a className="link" href="#/players">← All players</a>
        <p role="alert" className="banner">
          {error !== null ? `Couldn't load this player (${error}).` : "Couldn't read this player's data."}{" "}
          <button type="button" onClick={retry}>Retry</button>
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
    <section className="page page--wide">
      <a className="link" href="#/players">← All players</a>
      <div className="player__head">
        <h2>{player.name}</h2>
        <span className="card__team" style={{ color }}>{player.team}</span>
        <span className="rating" aria-label={`Rating ${formatRating(player.rating)}`}>
          {formatRating(player.rating)}
        </span>
      </div>

      <div className="player">
        <div className="player__main">
          {player.stats.length > 0 && (
            <dl className="facts">
              {player.stats.map((s) => (
                <div key={s.key}>
                  <dt>{prettyKey(s.key)}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <section className="panel" aria-label="Rating breakdown">
            <h3>Rating breakdown</h3>
            {player.breakdown.length === 0 ? (
              <p className="empty">No breakdown available.</p>
            ) : (
              player.breakdown.map((b) => (
                <div key={b.label} className="bd-row">
                  <span>{b.label}</span>
                  <div className="bd-bar" role="img" aria-label={`${b.label} ${round2(b.value)}`}>
                    <span
                      style={{
                        width: `${(Math.abs(b.value) / maxAbs) * 100}%`,
                        background: b.value >= 0 ? "var(--accent)" : "var(--warn)",
                      }}
                    />
                  </div>
                  <span className="bd-val">{b.value > 0 ? `+${round2(b.value)}` : round2(b.value)}</span>
                </div>
              ))
            )}
          </section>

          <ReviewPanel id={player.id} lang={lang} onShow={show} />

          <section className="panel" aria-label="Key moments">
            <h3>Key moments</h3>
            {player.moments.length === 0 ? (
              <p className="empty">No key moments yet.</p>
            ) : (
              <ul className="list-plain">
                {player.moments.map((m, n) => (
                  <li key={`${n}-${m.text}`} className="moment">
                    <div className="card__meta">
                      {m.minute !== undefined && <span className="card__minute">{formatMinute(m.minute)}</span>}
                    </div>
                    <p className="moment__text">{stripCitations(m.text)}</p>
                    <Evidence ids={m.evidence} />
                    <div className="cue__actions">
                      {m.evidence.length > 0 && (
                        <button type="button" onClick={() => show(m.evidence, "moment")}>Show on pitch</button>
                      )}
                      {m.insightId !== undefined && (
                        <a className="link" href={`#/insight/${encodeURIComponent(m.insightId)}`}>Open insight →</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" aria-label="Actions and why">
            <h3>Actions, and why they mattered</h3>
            {player.actions.length === 0 ? (
              <p className="empty">No actions recorded yet.</p>
            ) : (
              <ul className="list-plain">
                {player.actions.map((a, n) => (
                  <li key={`${n}-${a.eventId ?? a.why}`} className="moment">
                    <div className="card__meta">
                      {a.minute !== undefined && <span className="card__minute">{formatMinute(a.minute)}</span>}
                      {a.type !== undefined && <span className="card__kind">{prettyKey(a.type)}</span>}
                    </div>
                    <p className="moment__text">{a.why}</p>
                    <Evidence ids={a.evidence} />
                    <div className="cue__actions">
                      {a.evidence.length > 0 && (
                        <button type="button" onClick={() => show(a.evidence, a.type ?? "action")}>
                          Show on pitch
                        </button>
                      )}
                      {a.insightId !== undefined && (
                        <a className="link" href={`#/insight/${encodeURIComponent(a.insightId)}`}>Open insight →</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {teams.length > 0 && (
          <div className="player__side">

            <Heatmap events={allCited} teams={teams} />

            <Pitch events={allEvents} selected={selected} teams={teams} />
            <p className="empty">
              {picked.ids.length > 0
                ? `Showing: ${picked.label}${missing > 0 ? ` (${missing} cited event(s) not found in /events)` : ""}`
                : "Choose “Show on pitch” on a moment, action or the review."}
            </p>
            {picked.ids.length > 0 && (
              <div>
                <button type="button" onClick={() => show([], "")}>Clear</button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}