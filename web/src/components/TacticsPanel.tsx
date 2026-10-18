// web/src/components/TacticsPanel.tsx - a team's tactics from /team/{team}/tactics.
import { Button } from "@/components/Button";
import { FactorsList } from "@/components/FactorsList";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getTactics } from "@/lib/api";
import { readTactics } from "@/lib/extras";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";

const STAT = "rounded-card border border-line bg-surface px-3.5 py-2";

export function TacticsPanel({ team }: { team: string }) {
  const { data, loading, error, notFound, retry } = useApi(getTactics, team);
  const view = data === null ? null : readTactics(data);

  return (
    <section className={ui.panel} aria-label="Tactics">
      <h3 className={ui.h3}>Tactics</h3>
      {loading && <Loader label="Loading tactics" />}
      {notFound && <p className={ui.empty}>No tactics for this team.</p>}
      {error !== null && !notFound && (
        <p className={ui.empty}>
          Couldn't load the tactics. <Button onClick={retry}>Retry</Button>
        </p>
      )}
      {!loading && error === null && data !== null && view === null && (
        <p className={ui.empty}>No tactics to show yet.</p>
      )}

      {view && (
        <>
          {view.headline && <p className="m-0 font-heading text-lg font-bold">{view.headline}</p>}
          {view.text && <p className="m-0 leading-snug">{view.text}</p>}

          {view.facts.length > 0 && (
            <dl className="m-0 flex flex-wrap gap-2.5">
              {view.facts.map(([k, v]) => (
                <div key={k} className={STAT}>
                  <dt className="text-[.7rem] text-muted uppercase">{prettyKey(k)}</dt>
                  <dd className="m-0 font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {view.metrics.length > 0 && (
            <dl className="m-0 flex flex-wrap gap-2.5">
              {view.metrics.map(([k, v]) => (
                <div key={k} className={STAT}>
                  <dt className="text-[.7rem] text-muted uppercase">{prettyKey(k)}</dt>
                  <dd className="m-0 font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {view.sections.map((s) => (
            <div key={s.title} className="grid gap-2">
              <h4 className="m-0 text-base font-semibold">{s.title}</h4>
              <FactorsList items={s.items} />
            </div>
          ))}

          {view.evidence.length > 0 && (
            <div className={ui.chips}>
              {view.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
            </div>
          )}
        </>
      )}
    </section>
  );
}