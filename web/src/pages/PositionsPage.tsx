// web/src/pages/PositionsPage.tsx - where each player was last seen, with a minute scrubber.
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { PositionsPitch } from "@/components/PositionsPitch";
import { getPositions } from "@/lib/api";
import { formatMinute, teamColor } from "@/lib/match";
import { byTeamThenName, sinceLabel } from "@/lib/positions";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { PositionsResponse } from "@/types/types";

export function PositionsPage() {
  const { match, teams, allEvents } = useMatch();
  const lastEvent = allEvents.reduce((max, e) => Math.max(max, e.minute), 0);
  const duration = Math.max(1, Math.ceil(match?.duration_min ?? lastEvent));

  // null means the end of the match; a number is the minute the viewer scrubbed to.
  const [scrub, setScrub] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Dragging the scrubber refetches only when it settles, so the pitch stays still.
  useEffect(() => {
    const timer = setTimeout(() => setMinute(scrub), 200);
    return () => clearTimeout(timer);
  }, [scrub]);

  const at = minute ?? duration;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPositions(at)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Request failed");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [at, attempt]);

  const players = (data?.players ?? []).slice().sort(byTeamThenName);
  const shown = scrub ?? duration;

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Positions: where each player was last seen</h2>

      <div className="grid gap-2">
        <label htmlFor="positions-minute" className="text-sm font-semibold">
          Minute
        </label>
        <input
          id="positions-minute"
          type="range"
          min={0}
          max={duration}
          step={1}
          value={Math.min(shown, duration)}
          onChange={(e) => setScrub(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={ui.minute}>{formatMinute(shown)}</span>
          <span className="text-[.85rem] text-muted">of {duration} minutes</span>
          <Button variant="ghost" onClick={() => setScrub(null)}>Show the end</Button>
        </div>
      </div>

      {loading && data === null && <Loader label="Loading the last-seen positions" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't load the positions ({error}).{" "}
          <Button className={ui.bannerButton} onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
        </p>
      )}

      {data && (
        <>
          <p className="m-0 rounded-card border border-line bg-surface-2 px-3.5 py-2.5 text-[.88rem]">
            {data.note}
          </p>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <PositionsPitch data={data} teams={teams} />

            <section className={ui.panel} aria-label="Players last seen">
              <h3 className={ui.h3}>Last seen</h3>
              {players.length === 0 ? (
                <p className={ui.empty}>No player has acted by this minute.</p>
              ) : (
                <ul className="m-0 grid list-none gap-1.5 p-0">
                  {players.map((p) => {
                    const color = teamColor(p.team, teams);
                    return (
                      <li key={`${p.team}-${p.player}`} className="grid gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                          <span className="font-semibold">{p.player}</span>
                          <span className="text-[.8rem]" style={{ color }}>{p.team}</span>
                          {p.on_ball && <span className={ui.marker}>on the ball</span>}
                        </div>
                        <div className="flex flex-wrap gap-2.5 text-[.82rem] text-muted">
                          <span>last seen {formatMinute(p.minute)}</span>
                          <span>{sinceLabel(p.since)}</span>
                          <span className="tabular-nums">{p.actions} actions</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
