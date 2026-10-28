// web/src/pages/PlayerPage.tsx - one player: stats, rating receipt, review, moments and explained actions.
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { Heatmap } from "@/components/Heatmap";
import { Loader } from "@/components/Loader";
import { Pitch } from "@/components/Pitch";
import { PlayerCompare } from "@/components/players/PlayerCompare";
import { RatingReceipt } from "@/components/RatingReceipt";
import { ReviewPanel } from "@/components/ReviewPanel";
import { useApi } from "@/hooks/useApi";
import { useCompare } from "@/hooks/useCompare";
import { getPlayer } from "@/lib/api";
import { eventsByIds, formatMinute, teamColor } from "@/lib/match";
import { formatRating, formatStat, prettyKey, readMoment, STAT_LABELS, type StatKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const STAT_ORDER = Object.keys(STAT_LABELS) as StatKey[];

export function PlayerPage({ id }: { id: string }) {
  const { teams, allEvents, byId, lang, pinned, pin } = useMatch();
  const { data: player, loading, error, notFound, retry } = useApi(getPlayer, id);
  const { vs, setVs } = useCompare();
  const [showRoutine, setShowRoutine] = useState(false);

  const back = (
    <a
      className={`${ui.link} inline-flex items-center gap-1.5 text-sm hover:gap-2 transition-all`}
      href="#/players"
    >
      <ArrowLeft size={14} aria-hidden="true" /> All players
    </a>
  );

  if (loading) {
    return (
      <section className={ui.page}>
        {back}
        <Loader label="Loading player" />
      </section>
    );
  }

  if (error !== null || player === null) {
    return (
      <section className={ui.page}>
        {back}
        {notFound ? (
          <p className={ui.empty}>Player not found.</p>
        ) : (
          <p role="alert" className={ui.banner}>
            Couldn't load this player ({error}).{" "}
            <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
          </p>
        )}
      </section>
    );
  }

  const color = teamColor(player.team, teams);
  const routineCount = player.actions.filter((a) => a.routine).length;
  const actions = showRoutine ? player.actions : player.actions.filter((a) => !a.routine);
  const moments = player.moments.map(readMoment).filter((m) => m !== null);
  const selected = eventsByIds(pinned ?? [], byId);
  const ownEvents = allEvents.filter((e) => e.team === player.team && e.player === player.name);
  const pinIds = (ids: string[]) => pin(pinned !== null && pinned.join() === ids.join() ? null : ids);

  return (
    <section className={ui.pageWide}>
      {back}

      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className={ui.h2}>{player.name}</h2>
        <span className="font-bold" style={{ color }}>{player.team}</span>
        <span
          className="rounded-lg px-2.5 py-1 font-heading text-[1.6rem] font-bold tabular-nums ring-1 ring-inset"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: color }}
          aria-label={`Rating ${formatRating(player.rating)}`}
        >
          {formatRating(player.rating)}
        </span>
      </div>

      <div className={ui.split}>
        <div className="grid min-w-0 gap-4">
          <dl className="m-0 flex flex-wrap gap-2.5">
            {STAT_ORDER.map((k) => (
              <div
                key={k}
                className="grid gap-0.5 rounded-card border border-line bg-surface px-3.5 py-2"
              >
                <dt className="text-[.7rem] font-semibold uppercase tracking-wider text-muted">
                  {STAT_LABELS[k]}
                </dt>
                <dd className="m-0 font-heading text-lg font-bold tabular-nums text-fg">
                  {formatStat(k, player[k])}
                </dd>
              </div>
            ))}
            {player.goal_minutes.length > 0 && (
              <div className="grid gap-0.5 rounded-card border border-line bg-surface px-3.5 py-2">
                <dt className="text-[.7rem] font-semibold uppercase tracking-wider text-muted">
                  Goal minutes
                </dt>
                <dd className="m-0 font-heading text-lg font-bold tabular-nums text-fg">
                  {player.goal_minutes.map(formatMinute).join(" ")}
                </dd>
              </div>
            )}
          </dl>

          <RatingReceipt lines={player.rating_breakdown} rating={player.rating} />
          <ReviewPanel id={player.id} lang={lang} />

          <section className={ui.panel} aria-label="Where this player was involved">
            <h3 className={ui.h3}>Where {player.name} was involved</h3>
            <div className="grid gap-2">
              <Heatmap events={ownEvents} teams={teams} color={color} />
              <p className="m-0 text-[.8rem] leading-relaxed text-muted">
                The map of {ownEvents.length} event{ownEvents.length === 1 ? "" : "s"} by {player.name} in
                the match data. Brighter means more of their events fell there.
              </p>
            </div>
          </section>

          {vs && vs !== id && (
            <PlayerCompare
              current={player}
              opponentId={vs}
              teams={teams}
              events={allEvents}
              onPick={setVs}
              onClear={() => setVs(null)}
            />
          )}

          {moments.length > 0 && (
            <section className={ui.panel} aria-label="Key moments">
              <h3 className={ui.h3}>Key moments</h3>
              <ul className="grid gap-2.5">
                {moments.map((m, n) => (
                  <li
                    key={`${n}-${m.text}`}
                    className="grid gap-2 rounded-card border border-line bg-surface px-3.5 py-3 transition-colors hover:border-accent/30"
                  >
                    <p className={`m-0 ${ui.meta}`}>
                      {m.minute !== undefined && <span className={ui.minute}>{formatMinute(m.minute)}</span>}
                      {m.role && <span>{prettyKey(m.role)}</span>}
                    </p>
                    <p className="m-0 leading-relaxed">{m.text}</p>
                    <div className={ui.actions}>
                      {m.evidence.length > 0 && (
                        <Button
                          aria-pressed={pinned !== null && pinned.join() === m.evidence.join()}
                          onClick={() => pinIds(m.evidence)}
                        >
                          Highlight on pitch
                        </Button>
                      )}
                      {m.insightId && (
                        <a className={ui.link} href={`#/insight/${encodeURIComponent(m.insightId)}`}>
                          Open insight →
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={ui.panel} aria-label="Actions and why">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={ui.h3}>Actions, and why they mattered</h3>
              {routineCount > 0 && (
                <Button aria-pressed={showRoutine} onClick={() => setShowRoutine((v) => !v)}>
                  Routine actions ({routineCount}): {showRoutine ? "shown" : "hidden"}
                </Button>
              )}
            </div>
            {actions.length === 0 ? (
              <p className={ui.empty}>
                {player.actions.length === 0
                  ? "No actions recorded."
                  : `All ${player.actions.length} actions are routine. Use the toggle to see them.`}
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {actions.map((a, n) => (
                  <li
                    key={`${n}-${a.event_id}`}
                    className="grid gap-2 rounded-card border border-line bg-surface px-3.5 py-3 transition-colors hover:border-accent/30"
                  >
                    <p className={`m-0 ${ui.meta}`}>
                      <span className={ui.minute}>{formatMinute(a.minute)}</span>
                      <span>{prettyKey(a.action)}</span>
                      {a.role && <span className={ui.chip}>{a.role}</span>}
                      {a.routine && <span className={ui.quiet}>Routine</span>}
                    </p>
                    <p className="m-0 leading-relaxed">{a.why}</p>
                    {a.detail && (
                      <p className="m-0 text-[.9rem] leading-relaxed text-muted">{a.detail}</p>
                    )}
                    <div className={ui.chips}>
                      {a.evidence.map((e) => (
                        <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
                      ))}
                    </div>
                    <div className={ui.actions}>
                      {a.evidence.length > 0 && (
                        <Button
                          aria-pressed={pinned !== null && pinned.join() === a.evidence.join()}
                          onClick={() => pinIds(a.evidence)}
                        >
                          Highlight on pitch
                        </Button>
                      )}
                      {a.insight_id && (
                        <a className={ui.link} href={`#/insight/${encodeURIComponent(a.insight_id)}`}>
                          Open insight →
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {teams.length > 0 && (
          <div className={ui.side}>
            <Pitch events={allEvents} selected={selected} teams={teams} />
            <p className={ui.empty}>
              {selected.length > 0
                ? "Showing the highlighted evidence."
                : "Use “Highlight on pitch” to see the evidence."}
            </p>
            {pinned !== null && (
              <div>
                <Button variant="ghost" onClick={() => pin(null)}>Clear</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}