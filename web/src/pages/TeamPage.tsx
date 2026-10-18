import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
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
