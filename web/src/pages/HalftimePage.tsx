// web/src/pages/HalftimePage.tsx - what the first half showed for each team.
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getHalftime } from "@/lib/api";
import { teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { BriefFinding, HalftimeBrief } from "@/types/types";

const GROUPS: { key: "worked" | "didnt" | "watch"; title: string; note: string }[] = [
  { key: "worked", title: "What worked", note: "The first half's facts that favoured them." },
  { key: "didnt", title: "What did not", note: "The first half's facts that went against them." },
  { key: "watch", title: "What to watch", note: "What the same data says to look for in the second half." },
];

function Findings({ title, note, items }: { title: string; note: string; items: BriefFinding[] }) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-2" aria-label={title}>
      <h4 className="m-0 text-base font-bold">{title}</h4>
      <p className="m-0 text-[.82rem] text-muted">{note}</p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {items.map((finding) => (
          <li
            key={finding.code + finding.title}
            className="grid gap-1.5 rounded-card border border-line bg-surface px-3.5 py-3 transition-colors hover:border-accent/30"
          >
            <p className="m-0 font-semibold">{finding.title}</p>
            <p className="m-0 text-[.92rem] leading-relaxed">{finding.detail}</p>
            {finding.principle && (
              <p className="m-0 rounded-md border-l-2 border-line bg-surface-2/50 px-2.5 py-1.5 text-[.82rem] leading-relaxed text-muted">
                {finding.principle}
              </p>
            )}
            <EvidenceChips ids={finding.evidence} highlight={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Brief({ brief, teams }: { brief: HalftimeBrief; teams: string[] }) {
  const color = teamColor(brief.team, teams);
  if (!brief.available) {
    return (
      <section className={ui.panel} aria-label={`Half-time brief for ${brief.team}`}>
        <h3 className={ui.h3} style={{ color }}>{brief.team}</h3>
        <p className={ui.empty}>{brief.reason}</p>
      </section>
    );
  }
  const stats = brief.stats;
  return (
    <section className={ui.panel} aria-label={`Half-time brief for ${brief.team}`}>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h3 className={ui.h3} style={{ color }}>{brief.team}</h3>
        {brief.halftime_score && (
          <span className="rounded-lg bg-surface-2 px-2.5 py-0.5 text-[.9rem] font-semibold tabular-nums ring-1 ring-inset ring-line">
            {brief.halftime_score[brief.team] ?? 0}-{(brief.halftime_score[brief.opponent ?? ""] ?? 0)} at half-time
          </span>
        )}
      </div>

      {brief.text && <p className="m-0 leading-relaxed">{brief.text}</p>}

      {stats && (
        <dl className="m-0 flex flex-wrap gap-2.5">
          {[
            ["Shots", stats.shots],
            ["Expected goals", stats.xg_for.toFixed(1)],
            ["Conceded (xG)", stats.xg_against.toFixed(1)],
            ["Final-third entries", stats.final_third_entries],
            ["Ended in a shot", stats.entries_with_shot],
            ["Actions", stats.actions],
          ].map(([label, value]) => (
            <div key={String(label)} className="grid gap-0.5 rounded-card border border-line bg-surface px-3.5 py-2">
              <dt className="text-[.68rem] font-semibold uppercase tracking-wider text-muted">
                {label}
              </dt>
              <dd className="m-0 font-heading text-lg font-bold tabular-nums text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {GROUPS.map((group) => (
        <Findings
          key={group.key}
          title={group.title}
          note={group.note}
          items={brief[group.key] ?? []}
        />
      ))}
    </section>
  );
}

export function HalftimePage() {
  const { teams, lang } = useMatch();
  const { data, loading, error, retry } = useApi(getHalftime, lang);
  const briefs = data?.briefs ?? [];

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Half-time</h2>
      <p className={`${ui.empty} max-w-prose`}>
        What the first half showed for each team: what worked, what did not, and what the match data
        says to watch in the second half.
      </p>

      {loading && <Loader label="Reading the first half" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't read the half-time brief ({error}).{" "}
          <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}

      {data && !loading && (
        <>
          <p className="m-0 rounded-card border border-line bg-surface-2 px-3.5 py-2.5 text-[.88rem] leading-relaxed">
            {data.note}
          </p>
          {briefs.length === 0 ? (
            <p className={ui.empty}>No half-time brief yet.</p>
          ) : (
            <div className="grid gap-4">
              {briefs.map((brief) => (
                <Brief key={brief.team} brief={brief} teams={teams} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}