// web/src/pages/FoulsPage.tsx - every foul with its situation and what followed.
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getFouls } from "@/lib/api";
import { formatMinute, teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const MARKED = new Set(["trailing", "repeat_offender"]);

export function FoulsPage() {
  const { teams } = useMatch();
  const { data, loading, error, retry } = useApi(getFouls, "all");
  const fouls = data ?? [];

  return (
    <section className={ui.page}>
      <h2 className={ui.h2}>Fouls</h2>
      {loading && <Loader label="Loading fouls" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't load fouls ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}
      {!loading && error === null && fouls.length === 0 && <p className={ui.empty}>No fouls in this match.</p>}

      <ul className="grid gap-2.5">
        {fouls.map((f, i) => (
          <li
            key={`${i}-${f.event_id}`}
            className="grid gap-2 rounded-card border border-l-4 border-line bg-surface p-3.5"
            style={{ borderLeftColor: teamColor(f.team, teams) }}
          >
            <p className={`m-0 ${ui.meta}`}>
              <span className={ui.minute}>{formatMinute(f.minute)}</span>
              {f.player && <span className="font-semibold text-fg">{f.player}</span>}
              <span style={{ color: teamColor(f.team, teams) }}>{f.team}</span>
              {(f.factors ?? []).map((c) =>
                MARKED.has(c) ? (
                  <span key={c} className={ui.marker}>{prettyKey(c)}</span>
                ) : (
                  <span key={c} className={ui.quiet}>{prettyKey(c)}</span>
                ),
              )}
            </p>
            <p className="m-0 leading-snug">{f.why}</p>
            {f.detail && <p className="m-0 text-[.9rem] text-muted">{f.detail}</p>}
            <div className={ui.chips}>
              {f.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
            </div>
            {f.insight_id && (
              <a className={ui.link} href={`#/insight/${encodeURIComponent(f.insight_id)}`}>Open insight →</a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}