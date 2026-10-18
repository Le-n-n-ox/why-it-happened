// web/src/components/WhyPanel.tsx - "Why <winner> won": appears at full time, text and reasons come from /why.
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { useApi } from "@/hooks/useApi";
import { getWhy } from "@/lib/api";
import { formatMinute, stripCitations } from "@/lib/match";
import { ui } from "@/lib/ui";
import { normalizeWhy } from "@/lib/why";
import { useMatch } from "@/types/matchContext";

function WhyBody({ title }: { title: string }) {
  const { lang } = useMatch();
  const { data, error, loading, retry } = useApi(getWhy, lang);
  const why = data === null ? null : normalizeWhy(data);
  const extraTitle = why?.title !== undefined && why.title !== title ? why.title : undefined;

  return (
    <section
      aria-label={title}
      className="grid gap-3 rounded-card border border-t-4 border-line border-t-accent bg-surface px-[18px] py-4 shadow-card"
    >
      <h2 className={ui.h2}>{title}</h2>
      {extraTitle !== undefined && <p className="m-0 font-semibold text-muted">{extraTitle}</p>}

      {loading && <Skeleton className="h-20" />}
      {error !== null && (
        <p className={ui.empty}>
          The match explanation isn't available yet.{" "}
          <Button onClick={retry}>Retry</Button>
        </p>
      )}
      {!loading && error === null && why === null && <p className={ui.empty}>No explanation for this match yet.</p>}

      {why !== null && (
        <>
          {why.summary !== undefined && (
            <p className="m-0 text-[1.05rem] leading-snug" lang={lang}>{stripCitations(why.summary)}</p>
          )}
          {why.reasons.length > 0 && (
            <ol className="grid gap-2.5">
              {why.reasons.map((r, i) => (
                <li key={`${i}-${r.text}`} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink">
                    {i + 1}
                  </span>
                  <div className="grid min-w-0 gap-1 pt-0.5">
                    <p className="m-0 leading-snug" lang={lang}>{stripCitations(r.text)}</p>
                    <div className={ui.chips}>
                      {r.minute !== undefined && <span className={ui.chip}>{formatMinute(r.minute)}</span>}
                      {r.evidence.map((e) => <span key={e} className={ui.chip}>{e}</span>)}
                    </div>
                    {r.insightId !== undefined && (
                      <a className={ui.link} href={`#/insight/${encodeURIComponent(r.insightId)}`}>
                        Open insight →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {why.evidence.length > 0 && (
            <div className={ui.chips}>
              {why.evidence.map((e) => <span key={e} className={ui.chip}>{e}</span>)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function WhyPanel() {
  const { teams, score, ended } = useMatch();
  if (!ended || teams.length < 2) return null;
  
  const [home, away] = teams;
  
  // Safely extract scores with a 0 fallback to satisfy strict TypeScript null checks
  const homeScore = score?.[home] ?? 0;
  const awayScore = score?.[away] ?? 0;
  const diff = homeScore - awayScore;
  
  const title = diff === 0 ? "Why it finished level" : `Why ${diff > 0 ? home : away} won`;
  
  return <WhyBody title={title} />;
}