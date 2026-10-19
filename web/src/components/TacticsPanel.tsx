// web/src/components/TacticsPanel.tsx - what a team visibly did: tactics with verdicts, second-half story, formation.
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { ValidationNote } from "@/components/ValidationNote";
import { useApi } from "@/hooks/useApi";
import { getTactics } from "@/lib/api";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { FormationEstimate, Tactics } from "@/types/types";

const VERDICT: Record<string, string> = {
  worked: "bg-accent text-accent-ink",
  mixed: "bg-surface-3 text-fg",
  "did not work": "bg-warn text-black",
};

function SecondHalf({ t }: { t: Tactics }) {
  const sh = t.second_half;
  const changes = sh.changes ?? [];
  return (
    <div className="grid gap-2">
      <h4 className="m-0 text-base font-semibold">Second half</h4>
      {t.second_half_story.map((line, i) => (
        <p key={`${i}-${line}`} className="m-0 leading-snug">{line}</p>
      ))}
      {!sh.available && sh.reason && <p className={ui.empty}>{sh.reason}</p>}
      {sh.available && sh.effect && (
        <p className="m-0">
          <span className="text-muted">Did it help? </span>
          <span className="font-semibold">{sh.effect}</span>
        </p>
      )}
      {changes.length > 0 && (
        <ul className="grid gap-2">
          {changes.map((c) => (
            <li key={c.code} className="grid gap-1 rounded-card bg-surface-2 px-3.5 py-3">
              <p className="m-0 font-semibold">
                <span aria-hidden="true">{c.direction === "up" ? "↑" : c.direction === "down" ? "↓" : "→"}</span> {c.title}
              </p>
              <p className="m-0 text-[.95rem]">{c.detail}</p>
              <EvidenceChips ids={c.evidence} highlight={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Formation({ f }: { f: FormationEstimate }) {
  const facts = Object.entries(f).filter(
    ([k, v]) => k !== "available" && k !== "reason" && (typeof v === "string" || typeof v === "number"),
  );
  return (
    <div className="grid gap-2">
      <h4 className="m-0 text-base font-semibold">Formation</h4>
      {f.available ? (
        facts.length > 0 && (
          <dl className="m-0 flex flex-wrap gap-2.5">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-card border border-line bg-surface px-3.5 py-2">
                <dt className="text-[.7rem] text-muted uppercase">{prettyKey(k)}</dt>
                <dd className="m-0 font-bold">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )
      ) : (
        f.reason && <p className={ui.empty}>{f.reason}</p>
      )}
    </div>
  );
}

export function TacticsPanel({ team }: { team: string }) {
  const { data, loading, error, notFound, retry } = useApi(getTactics, team);

  return (
    <section className={ui.panel} aria-label="Tactics">
      <h3 className={ui.h3}>Tactics</h3>
      {loading && <Loader label="Loading tactics" />}
      {notFound && <p className={ui.empty}>Team not found.</p>}
      {error !== null && !notFound && (
        <p className={ui.empty}>
          Couldn't load the tactics. <Button onClick={retry}>Retry</Button>
        </p>
      )}

      {data && (
        <>
          {data.tactics.length === 0 ? (
            <p className={ui.empty}>No single style stands out for {data.team}.</p>
          ) : (
            <ul className="grid gap-2.5">
              {data.tactics.map((t: any) => (
                <li key={t.code} className="grid gap-1.5 rounded-card bg-surface-2 px-3.5 py-3">
                  <p className="m-0 flex flex-wrap items-center gap-2 font-semibold">
                    <span>{t.title}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
                        VERDICT[t.verdict] ?? "bg-surface-3 text-fg",
                      )}
                    >
                      {t.verdict}
                    </span>
                  </p>
                  <p className="m-0 text-[.95rem]">{t.detail}</p>
                  {t.principle && (
                    <p className="m-0 text-[.8rem] text-muted" title={t.principle}>
                      <span className="font-semibold">Why this matters: </span>{t.principle}
                    </p>
                  )}
                  <EvidenceChips ids={t.evidence} highlight={false} />
                </li>
              ))}
            </ul>
          )}
          <SecondHalf t={data} />
          <Formation f={data.formation} />
          <ValidationNote />
        </>
      )}
    </section>
  );
}