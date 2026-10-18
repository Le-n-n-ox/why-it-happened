// web/src/pages/AnalyticsPage.tsx - both teams side by side, drawn from /team/{team}/assessment.
import { Loader } from "@/components/Loader";
import { Donut, GroupedBars, Legend, type Series } from "@/components/charts";
import { Verdict } from "@/components/Verdict";
import { useApi } from "@/hooks/useApi";
import { getAssessment } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const loadAssessments = (key: string) =>
  Promise.all(key.split("|").filter(Boolean).map((t) => getAssessment(t)));

export function AnalyticsPage() {
  const { teams } = useMatch();
  const { data, loading, error } = useApi(loadAssessments, teams.join("|"));
  const reports = data ?? [];

  if (teams.length === 0) {
    return (
      <section className={ui.page}>
        <h2 className={ui.h2}>Analytics</h2>
        <p className={ui.empty}>Waiting for match data...</p>
      </section>
    );
  }

  const colors = teams.map((t) => teamColor(t, teams));
  const keys = [...new Set(reports.flatMap((r) => Object.keys(r.metrics)))].filter((k) =>
    reports.every((r) => typeof r.metrics[k] === "number"),
  );
  const series: Series[] = reports.map((r, i) => ({
    name: r.team,
    color: colors[teams.indexOf(r.team)] ?? colors[i],
    values: keys.map((k) => r.metrics[k]),
  }));

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Analytics</h2>
      <p className={ui.empty}>
        Every figure comes from the team reports. Nothing here is counted in the browser.
      </p>
      {loading && <Loader label="Loading team reports" />}
      {error !== null && <p role="alert" className={ui.banner}>Couldn't load the team reports ({error}).</p>}

      {reports.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {reports.map((r) => (
              <a
                key={r.team}
                href={`#/team/${encodeURIComponent(r.team)}`}
                className="grid gap-2 rounded-card border border-line bg-surface px-4 py-3.5 text-fg transition-colors hover:bg-surface-2"
              >
                <span className="font-bold" style={{ color: teamColor(r.team, teams) }}>{r.team}</span>
                <Verdict verdict={r.verdict} />
                <span className="font-heading text-2xl font-bold tabular-nums">Score {r.score}</span>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
            {keys.length > 0 && (
              <section className={`${ui.panel} min-w-0`} aria-label="Team metrics">
                <h3 className="m-0 text-base font-bold">Team metrics</h3>
                <Legend series={series} />
                <GroupedBars label="Team metrics" categories={keys.map(prettyKey)} series={series} />
              </section>
            )}
            <section className={`${ui.panel} min-w-0`} aria-label="Share of shots">
              <h3 className="m-0 text-base font-bold">Shots</h3>
              <Donut
                label="Shots by team"
                centerLabel="shots"
                slices={reports.map((r, i) => ({
                  label: r.team,
                  value: r.metrics["shots"] ?? 0,
                  color: colors[teams.indexOf(r.team)] ?? colors[i],
                }))}
              />
            </section>
          </div>
        </>
      )}
    </section>
  );
}