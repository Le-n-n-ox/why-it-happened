// web/src/pages/LivePage.tsx - pitch with the ball from each tick, and insight cards as they arrive.
import { useState } from "react";
import { ArrowRight } from "lucide-react";
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

export function LivePage() {
  const { insights, status, teams, shown, ball, byId, lang, ended, selectedId, select, pinned } = useMatch();
  const [eventId, setEventId] = useState<string | null>(null);
  const selected = pinned
    ? eventsByIds(pinned, byId)
    : evidenceEvents(insights.find((i) => i.id === selectedId), byId);

  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4 max-[1100px]:grid-cols-1">
      {teams.length > 0 && (
        <div className="grid gap-2.5">
          <Pitch events={shown} selected={selected} teams={teams} ball={ball} onEventClick={setEventId} />

          {eventId !== null ? (
            <EventWhyCard eventId={eventId} onClose={() => setEventId(null)} />
          ) : (
            <p className={`${ui.empty} text-center`}>Click any event on the pitch to see why it mattered.</p>
          )}

          {selectedId && (
            <>
              <a
                className={`${ui.link} inline-flex items-center gap-1 text-sm hover:gap-2 transition-all`}
                href={`#/insight/${encodeURIComponent(selectedId)}`}
              >
                Open full detail for this insight <ArrowRight size={14} aria-hidden="true" />
              </a>
              <WinProbability />
            </>
          )}
        </div>
      )}

      <section
        className="pr-1 min-[1101px]:max-h-[80vh] min-[1101px]:overflow-y-auto"
        aria-live="polite"
        aria-label="Live insights"
      >
        <MatchFlow events={shown} teams={teams} />

        {insights.length === 0 && status !== "error" && (
          <>
            <p className={ui.empty}>
              {shown.length
                ? "No key moment yet; live match flow is shown above."
                : "Waiting for the first insight..."}
            </p>
            <div className="mt-2.5 grid gap-2.5">
              <Skeleton />
              <Skeleton />
            </div>
          </>
        )}

        <ul className="m-0 grid list-none gap-2.5 p-0">
          {insights.map((i) => (
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
      </section>

      {ended && (
        <div className="col-span-2 grid gap-4 rounded-card border border-line bg-surface p-4 max-[1100px]:col-span-1">
          <a
            className={`${ui.link} inline-flex items-center gap-1 font-semibold hover:gap-2 transition-all`}
            href="#/result"
          >
            Full-time summary: why the result happened <ArrowRight size={14} aria-hidden="true" />
          </a>
          <Recap lang={lang} />
        </div>
      )}
    </div>
  );
}