// web/src/pages/LivePage.tsx - the live dashboard: pitch + insight feed.
import { InsightCard } from "../InsightCard";
import { evidenceEvents, teamColor } from "../match";
import { useMatch } from "../matchContext";
import { Pitch } from "../Pitch";
import { Recap } from "../Recap";

export function LivePage() {
  const { insights, status, teams, shown, byId, lang, ended, selectedId, select } = useMatch();
  const selected = evidenceEvents(insights.find((i) => i.id === selectedId), byId);

  return (
    <div className="live">
      {teams.length > 0 && (
        <div className="live__pitch">
          <Pitch events={shown} selected={selected} teams={teams} />
          {selectedId && (
            <a className="link" href={`#/insight/${encodeURIComponent(selectedId)}`}>
              Open full detail for this insight →
            </a>
          )}
        </div>
      )}

      <section className="live__feed" aria-live="polite" aria-label="Live insights">
        {insights.length === 0 && status !== "error" && (
          <p className="empty">Waiting for the first insight...</p>
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