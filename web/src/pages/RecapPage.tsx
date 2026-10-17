// web/src/pages/RecapPage.tsx - why the match went this way, a timeline of every insight, and the recap.
import { Recap } from "@/components/Recap";
import { WhyPanel } from "@/components/WhyPanel";
import { formatMinute, kindLabel, pickText, stripCitations, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

export function RecapPage() {
  const { insights, allEvents, teams, lang, ended } = useMatch();
  const chrono = [...insights].reverse(); // oldest first
  const last = allEvents.length ? allEvents[allEvents.length - 1].minute : 0;
  const maxMinute = Math.max(5, Math.ceil(last / 5) * 5);

  return (
    <section className={ui.page}>
      <WhyPanel />
      <h2 className={ui.h2}>Match timeline</h2>

      {insights.length === 0 ? (
        <p className={ui.empty}>No insights yet. Go to Live and let the match play.</p>
      ) : (
        <>
          <div className="relative h-7 rounded-full bg-surface" role="list" aria-label="Insights by minute">
            {chrono.map((i) => (
              <a
                key={i.id}
                role="listitem"
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg"
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
          <div className="-mt-2 flex justify-between text-xs text-muted" aria-hidden="true">
            <span>0'</span>
            <span>{maxMinute}'</span>
          </div>

          <ol className="grid gap-2.5">
            {chrono.map((i) => (
              <li key={i.id}>
                <a
                  className="grid gap-1 rounded-card border border-l-4 border-line bg-surface px-3.5 py-3 text-fg transition-colors hover:bg-surface-2"
                  href={`#/insight/${encodeURIComponent(i.id)}`}
                  style={{ borderLeftColor: teamColor(i.team, teams) }}
                >
                  <span className={ui.meta}>
                    <span className={ui.minute}>{formatMinute(i.minute)}</span>
                    <span className="font-bold" style={{ color: teamColor(i.team, teams) }}>{i.team}</span>
                    <span>{kindLabel(i.kind)}</span>
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
        <p className={ui.empty}>The full-time recap appears when the match ends.</p>
      )}
    </section>
  );
}