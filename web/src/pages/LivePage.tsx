// web/src/pages/LivePage.tsx - pitch with the ball from each tick, and insight cards as they arrive.
import { useState } from "react";
import { EventWhyCard } from "@/components/EventWhyCard";
import { InsightCard } from "@/components/InsightCard";
import { MatchFlow } from "@/components/MatchFlow";
import { Pitch } from "@/components/Pitch";
import { Recap } from "@/components/Recap";
import { Skeleton } from "@/components/Skeleton";
import { eventsByIds, evidenceEvents, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import { WinProbability } from "@/components/WinProbability";

// The live feed shows the last few moments; the rest stay one click away and live on /recap.
const FEED_LIMIT = 5;

export function LivePage() {
  const { insights, status, teams, shown, ball, byId, lang, ended, selectedId, select, pinned } = useMatch();
  const [eventId, setEventId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? insights : insights.slice(0, FEED_LIMIT);
  const hidden = insights.length - visible.length;
  const selected = pinned
    ? eventsByIds(pinned, byId)
    : evidenceEvents(insights.find((i) => i.id === selectedId), byId);

  // Narrow: one column, and the pitch lane's blocks are ordered around the feed (pitch, feed, chart).
  // Wide: the pitch lane becomes a real column on the left.
  return (
    <div className="flex flex-col gap-8 min-[1101px]:grid min-[1101px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1101px]:items-start min-[1101px]:gap-6">
      {teams.length > 0 && (
        <div className="contents min-[1101px]:grid min-[1101px]:gap-3">
          <section className="order-1 grid gap-3 min-[1101px]:order-none" aria-label="Match pitch">
            <Pitch events={shown} selected={selected} teams={teams} ball={ball} onEventClick={setEventId} />
            {eventId !== null ? (
              <EventWhyCard eventId={eventId} onClose={() => setEventId(null)} />
            ) : (
              <p className="m-0 text-[.82rem] text-muted">Click any event on the pitch to see why it mattered.</p>
            )}
          </section>

          <div className="order-3 min-[1101px]:order-none">
            <WinProbability compact />
          </div>
        </div>
      )}

      <section className="order-2 grid gap-5 min-[1101px]:order-none" aria-live="polite" aria-label="Live insights">
        <MatchFlow events={shown} teams={teams} />

        <div className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-lg font-bold">Insights</h2>
            {selectedId ? (
              <a className={`${ui.link} text-[.85rem]`} href={`#/insight/${encodeURIComponent(selectedId)}`}>
                Open full detail →
              </a>
            ) : (
              <span className="text-[.85rem] text-muted">{insights.length} so far</span>
            )}
          </div>

          {insights.length === 0 && status !== "error" && (
            <>
              <p className={ui.empty}>
                {shown.length ? "No key moment yet; the live match flow is above." : "Waiting for the first insight..."}
              </p>
              <div className="grid gap-3">
                <Skeleton />
                <Skeleton />
              </div>
            </>
          )}

          <ul className="grid gap-3">
            {visible.map((i) => (
              <InsightCard
                key={i.id}
                insight={i}
                lang={lang}
                color={teamColor(i.team, teams)}
                selected={i.id === selectedId}
                onSelect={select}
              />
            ))}
          </ul>

          {hidden > 0 && (
            <button type="button" className={`${ui.link} justify-self-start text-[.85rem]`} onClick={() => setShowAll(true)}>
              Show {hidden} earlier moment{hidden === 1 ? "" : "s"}
            </button>
          )}
          {showAll && insights.length > FEED_LIMIT && (
            <a className={`${ui.link} justify-self-start text-[.85rem]`} href="#/recap">
              View every moment by minute →
            </a>
          )}
        </div>
      </section>

      {ended && (
        <div className="order-last grid gap-4 min-[1101px]:col-span-2">
          <a className={ui.link} href="#/result">Full-time summary: why the result happened →</a>
          <Recap lang={lang} />
        </div>
      )}
    </div>
  );
}
