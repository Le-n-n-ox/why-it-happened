// web/src/pages/LivePage.tsx - the live dashboard: pitch + insight feed.
import { useState } from "react";
import { attackZones } from "@/lib/analytics";
import { InsightCard } from "@/components/InsightCard";
import { Loader } from "@/components/Loader";
import { evidenceEvents, teamColor } from "@/lib/match";
import { useMatch } from "@/types/matchContext";
import { Pitch } from "@/components/Pitch";
import { PowerSwitch } from "@/components/PowerSwitch";
import { Recap } from "@/components/Recap";

export function LivePage() {
  const { insights, status, teams, shown, byId, lang, ended, selectedId, select } = useMatch();
  const [showZones, setShowZones] = useState(false);
  const selected = evidenceEvents(insights.find((i) => i.id === selectedId), byId);

  return (
    <div className="live">
      {teams.length > 0 && (
        <div className="live__pitch">
          <div className="live__tools">
            <PowerSwitch checked={showZones} onChange={() => setShowZones((v) => !v)} label="Attack zones" />
          </div>
          <Pitch
            events={shown}
            selected={selected}
            teams={teams}
            zones={showZones ? attackZones(shown, teams) : undefined}
          />
          {selectedId && (
            <a className="link" href={`#/insight/${encodeURIComponent(selectedId)}`}>
              Open full detail for this insight →
            </a>
          )}
        </div>
      )}

      <section className="live__feed" aria-live="polite" aria-label="Live insights">
        {insights.length === 0 && status !== "error" && (
          <>
            <p className="empty">Waiting for the first insight...</p>
            <Loader label="Loading insights" />
          </>
        )}
        <ul className="feed">
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

      <div className="live__recap">
        <Recap insights={insights} lang={lang} ended={ended} />
      </div>
    </div>
  );
}