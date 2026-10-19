import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { TacticsPanel } from "@/components/TacticsPanel";
import { Verdict } from "@/components/Verdict";
import { useApi } from "@/hooks/useApi";
import { getAssessment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { Finding } from "@/types/types";

function Findings({ title, items, advice }: { title: string; items: Finding[]; advice?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section className={ui.panel} aria-label={title}>
      <h3 className={ui.h3}>{title}</h3>
      <ul className="grid gap-3">
        {items.map((finding) => (
          <li key={finding.code} className="grid gap-1.5 rounded-card bg-surface-2 px-3.5 py-3">
            <p className="m-0 font-semibold">{finding.title}</p>
            <p className="m-0 text-[.95rem]">{finding.detail}</p>
            {advice && finding.advice && (
              <p className="m-0 text-[.95rem]">
                <span className="font-semibold text-accent">Advice: </span>{finding.advice}
              </p>
            )}
            <div className={ui.chips}>
              {finding.evidence.map((id) => (
                <span key={id} className={`${ui.chip} font-mono`}>{id}</span>
              ))}
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

  const metrics = Object.entries(data.metrics).filter(([, value]) => typeof value === "number");
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
            {data.points.map((point, index) => (
              <li key={`${index}-${point.reason}`} className="flex items-baseline gap-2">
                <span>{point.reason}</span>
                <span className="min-w-4 flex-1 border-b border-dotted border-line" aria-hidden="true" />
                <span className={cn("font-mono tabular-nums", point.points >= 0 ? "text-accent" : "text-warn")}>
                  {point.points > 0 ? "+" : ""}{point.points}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {metrics.length > 0 && (
        <dl className="m-0 flex flex-wrap gap-2.5">
          {metrics.map(([key, value]) => (
            <div key={key} className="rounded-card border border-line bg-surface px-3.5 py-2">
              <dt className="text-[.7rem] text-muted uppercase">{prettyKey(key)}</dt>
              <dd className="m-0 font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Findings title="Strengths" items={data.strengths} />
      <Findings title="Issues" items={data.issues} advice />
      <TacticsPanel team={data.team} />

      {data.evidence.length > 0 && (
        <div className={ui.chips}>
          {data.evidence.map((id) => <span key={id} className={`${ui.chip} font-mono`}>{id}</span>)}
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
        {teams.map((name) => (
          <a
            key={name}
            href={`#/team/${encodeURIComponent(name)}`}
            aria-current={name === active ? "page" : undefined}
            className="rounded-full border-2 px-4 py-1.5 font-semibold text-fg aria-[current=page]:bg-surface-2"
            style={{ borderColor: teamColor(name, teams) }}
          >
            {name}
          </a>
        ))}
      </div>
      {active ? <TeamReport key={active} team={active} /> : <p className={ui.empty}>Waiting for match data...</p>}
    </section>
  );
}
