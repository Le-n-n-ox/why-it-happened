// web/src/pages/TeamPage.tsx - team report: verdict with its points, the written text, strengths and issues.
import { Loader } from "@/components/Loader";
import { Button } from "@/components/Button";
import { Verdict } from "@/components/Verdict";
import { useApi } from "@/hooks/useApi";
import { getAssessment } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMatch } from "@/types/matchContext";
import type { Finding } from "@/types/types";
import { TacticsPanel } from "@/components/TacticsPanel";

function Findings({ title, items, advice }: { title: string; items: Finding[]; advice?: boolean }) {
  if (items.length === 0) return null; // nothing to show means nothing is shown
  return (
    <section className={ui.panel} aria-label={title}>
      <h3 className={ui.h3}>{title}</h3>
      <ul className="grid gap-3">
        {items.map((f) => (
          <li key={f.code} className="grid gap-1.5 rounded-card bg-surface-2 px-3.5 py-3">
            <p className="m-0 font-semibold">{f.title}</p>
            <p className="m-0 text-[.95rem]">{f.detail}</p>
            {advice && f.advice && (
              <p className="m-0 text-[.95rem]">
                <span className="font-semibold text-accent">Advice: </span>{f.advice}
              </p>
            )}
            <div className={ui.chips}>
              {f.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamReport({ team }: { team: string }) {
  const { teams } = useMatch();
  const { data, loading, error, notFound, retry } = useApi(getAssessment, team);

  if (loading) return <Loader label="Loading team report" />;
  if (notFound) return <p className={ui.empty}>Team not found.</p>;
  if (error !== null || !data) {
    return (
      <p role="alert" className={ui.banner}>
        Couldn't load the team report. <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
      </p>
    );
  }

  const metrics = Object.entries(data.metrics).filter(([, v]) => typeof v === "number");
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className={ui.h2} style={{ color: teamColor(data.team, teams) }}>{data.team}</h2>
        <span className="text-muted">vs {data.opponent}</span>
        <Verdict verdict={data.verdict} />
        <span className="font-heading text-lg font-bold tabular-nums">Score {data.score}</span>
      </div>

      <p className="m-0 text-[1.05rem] leading-snug">{data.text}</p>

      {data.points.length > 0 && (
        <section className={ui.panel} aria-label="Points behind the verdict">
          <h3 className={ui.h3}>Points behind the verdict</h3>
          <ul className="grid gap-1.5 text-[.9rem]">
            {data.points.map((p, i) => (
              <li key={`${i}-${p.reason}`} className="flex items-baseline gap-2">
                <span>{p.reason}</span>
                <span className="min-w-4 flex-1 border-b border-dotted border-line" aria-hidden="true" />
                <span className={cn("font-mono tabular-nums", p.points >= 0 ? "text-accent" : "text-warn")}>
                  {p.points > 0 ? "+" : ""}{p.points}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {metrics.length > 0 && (
        <dl className="m-0 flex flex-wrap gap-2.5">
          {metrics.map(([k, v]) => (
            <div key={k} className="rounded-card border border-line bg-surface px-3.5 py-2">
              <dt className="text-[.7rem] text-muted uppercase">{prettyKey(k)}</dt>
              <dd className="m-0 font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <Findings title="Strengths" items={data.strengths} />
      <Findings title="Issues" items={data.issues} advice />
      <TacticsPanel team={data.team} />

      {data.evidence.length > 0 && (
        <div className={ui.chips}>
          {data.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
        </div>
      )}
    </div>
  );
}

export function TeamPage({ team }: { team?: string }) {
  const { teams } = useMatch();
  const active = team ?? teams[0];

  return (
    <section className={ui.page}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a team">
        {teams.map((t) => (
          <a
            key={t}
            href={`#/team/${encodeURIComponent(t)}`}
            aria-current={t === active ? "page" : undefined}
            className="rounded-full border-2 px-4 py-1.5 font-semibold text-fg aria-[current=page]:bg-surface-2"
            style={{ borderColor: teamColor(t, teams) }}
          >
            {t}
          </a>
        ))}
      </div>
      {active ? <TeamReport key={active} team={active} /> : <p className={ui.empty}>Waiting for match data...</p>}
    </section>
  );
}