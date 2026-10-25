// web/src/pages/HistoryPage.tsx - the insights saved in the database.
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getInsightHistory } from "@/lib/api";
import { formatMinute, kindLabel, stripCitations, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const LIMIT = 50;

export function HistoryPage() {
  const { teams } = useMatch();
  const [team, setTeam] = useState("all");
  const load = useCallback((t: string) => getInsightHistory(t === "all" ? undefined : t, LIMIT), []);
  const { data, loading, error, retry } = useApi(load, team);
  const records = data ?? [];

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>History</h2>
      <p className={`${ui.empty} max-w-prose`}>
        The insights this service has saved, newest minute first. Each row opens the full insight.
      </p>

      <div className="flex flex-wrap items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-2.5">
        <label htmlFor="history-team" className="text-sm font-semibold">
          Team
        </label>
        <select
          id="history-team"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium text-fg outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="all">All teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && <Loader label="Loading the saved insights" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't load the saved insights ({error}).{" "}
          <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}

      {!loading && error === null && records.length === 0 && (
        <p className={ui.empty}>
          No saved insights yet. They are saved as the match is narrated, so open the Live page and let
          it play.
        </p>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full border-collapse text-[.88rem]">
            <thead>
              <tr>
                {["Minute", "Team", "Kind", "Narration", "Evidence"].map((h) => (
                  <th key={h} className={ui.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-surface-2/40">
                  <td className={`${ui.td} tabular-nums`}>{formatMinute(r.minute)}</td>
                  <td className={ui.td} style={{ color: teamColor(r.team, teams) }}>{r.team}</td>
                  <td className={ui.td}>{kindLabel(r.kind)}</td>
                  <td className={ui.td}>
                    <a className={ui.link} href={`#/insight/${encodeURIComponent(r.id)}`}>
                      {stripCitations(r.narration) || "Open the insight"}
                    </a>
                  </td>
                  <td className={ui.td}>
                    <div className="flex flex-wrap gap-1.5">
                      {r.evidence.map((e) => (
                        <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}