
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";

// web/src/pages/TeamPage.tsx - team report: verdict with its points, the written text, strengths and issues.
import { Loader } from "@/components/Loader";
import { Button } from "@/components/Button";

import { Verdict } from "@/components/Verdict";
import { useApi } from "@/hooks/useApi";
import { getAssessment } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";

import { useMatch } from "@/types/matchContext";
import type { Finding } from "@/types/types";

function Findings({ title, findings }: { title: string; findings: Finding[] }) {
  return (
    <section className={ui.panel}>
      <h3 className={ui.h3}>{title}</h3>
      {findings.length === 0 ? <p className={ui.empty}>No findings.</p> : (
        <ul className="m-0 grid list-disc gap-3 pl-5">
          {findings.map((finding) => (
            <li key={finding.code}>
              <strong>{finding.title}</strong>
              <p className="my-1">{finding.detail}</p>
              {finding.advice && <p className="my-1 text-muted">Advice: {finding.advice}</p>}
              {finding.evidence.length > 0 && <p className="m-0 text-xs text-muted">Evidence: {finding.evidence.join(", ")}</p>}
            </li>
          ))}
        </ul>
      )}

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


export function TeamPage({ team }: { team?: string }) {
  const { teams } = useMatch();
  const selected = team ?? teams[0] ?? "";
  const { data, loading, error, notFound, retry } = useApi(getAssessment, selected);

  if (!selected) return <section className={ui.page}><h2 className={ui.h2}>Team assessment</h2><p className={ui.empty}>Waiting for match data...</p></section>;
  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Team assessment</h2>
      {teams.length > 1 && <nav className={ui.actions} aria-label="Choose team">
        {teams.map((name) => <a key={name} className={ui.link} href={`#/team/${encodeURIComponent(name)}`}>{name}</a>)}
      </nav>}
      {loading && <Loader label="Loading team assessment" />}
      {error && <p role="alert" className={ui.banner}>{notFound ? "Team not found." : <>Couldn't load this assessment ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button></>}</p>}
      {data && (
        <>
          <header className="grid gap-2 rounded-card border border-l-4 border-line bg-surface px-4 py-3.5" style={{ borderLeftColor: teamColor(data.team, teams) }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-xl font-bold">{data.team}</h3>
              <Verdict verdict={data.verdict} />
              <strong className="font-heading text-xl">Score {data.score}</strong>
            </div>
            <p className="m-0">{data.text}</p>
          </header>
          <section className={ui.panel}>
            <h3 className={ui.h3}>Match metrics</h3>
            <dl className="m-0 flex flex-wrap gap-2.5">
              {Object.entries(data.metrics).map(([key, value]) => <div key={key} className="rounded-card border border-line bg-surface px-3 py-2">
                <dt className="text-xs text-muted">{prettyKey(key)}</dt><dd className="m-0 font-bold tabular-nums">{value}</dd>
              </div>)}
            </dl>
          </section>
          <Findings title="Strengths" findings={data.strengths} />
          <Findings title="Areas to improve" findings={data.issues} />
        </>
      )}
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

