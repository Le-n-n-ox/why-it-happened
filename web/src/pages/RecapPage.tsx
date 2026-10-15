// web/src/pages/RecapPage.tsx - timeline of every insight, plus the full-time recap.
import { formatMinute, kindLabel, pickText, stripCitations, teamColor } from "../match";
import { useMatch } from "../matchContext";
import { Recap } from "../Recap";

export function RecapPage() {
  const { insights, allEvents, teams, lang, ended } = useMatch();
  const chrono = [...insights].reverse(); // oldest first
  const last = allEvents.length ? allEvents[allEvents.length - 1].minute : 0;
  const maxMinute = Math.max(5, Math.ceil(last / 5) * 5);

  return (
    <section className="page">
      <h2>Match timeline</h2>

      {insights.length === 0 ? (
        <p className="empty">No insights yet. Go to Live and let the match play.</p>
      ) : (
        <>
          <div className="track" role="list" aria-label="Insights by minute">
            {chrono.map((i) => (
              <a
                key={i.id}
                role="listitem"
                className="track__marker"
                href={`#/insight/${encodeURIComponent(i.id)}`}
                style={{
                  left: `${Math.min(100, (i.minute / maxMinute) * 100)}%`,
                  background: teamColor(i.team, teams),
                }}
                aria-label={`${formatMinute(i.minute)} ${i.team} ${kindLabel(i.kind)}`}
                title={`${formatMinute(i.minute)} ${i.team}: ${kindLabel(i.kind)}`}
              />
            ))}
          </div>
          <div className="track__scale" aria-hidden="true">
            <span>0'</span>
            <span>{maxMinute}'</span>
          </div>

          <ol className="timeline">
            {chrono.map((i) => (
              <li key={i.id}>
                <a
                  className="tl__item"
                  href={`#/insight/${encodeURIComponent(i.id)}`}
                  style={{ borderLeftColor: teamColor(i.team, teams) }}
                >
                  <span className="card__meta">
                    <span className="card__minute">{formatMinute(i.minute)}</span>
                    <span className="card__team" style={{ color: teamColor(i.team, teams) }}>{i.team}</span>
                    <span className="card__kind">{kindLabel(i.kind)}</span>
                  </span>
                  <span lang={lang in i.narration ? lang : "en"}>
                    {stripCitations(pickText(i, lang))}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </>
      )}

      {ended ? (
        <Recap insights={insights} lang={lang} ended={ended} />
      ) : (
        <p className="empty">The full-time recap appears when the match ends.</p>
      )}
    </section>
  );
}