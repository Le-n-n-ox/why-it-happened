import { motion } from "framer-motion";
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

// Upgraded Verdict Badges with refined borders and shadows
const VERDICT: Record<string, string> = {
  worked: "bg-accent text-accent-ink shadow-sm ring-1 ring-accent/50",
  mixed: "bg-surface-3 text-fg ring-1 ring-border",
  "did not work": "bg-warn text-black shadow-sm ring-1 ring-warn/50",
};

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0.2 } }
};

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "up") {
    return <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent ring-1 ring-accent/30" aria-hidden="true">↑</span>;
  }
  if (direction === "down") {
    return <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-live/20 text-[10px] font-bold text-live ring-1 ring-live/30" aria-hidden="true">↓</span>;
  }
  return <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold text-muted ring-1 ring-line" aria-hidden="true">→</span>;
}

function SecondHalf({ t }: { t: Tactics }) {
  const sh = t.second_half;
  const changes = sh.changes ?? [];
  return (
    <div className="mt-8 grid gap-4 border-t border-line pt-6">
      <h4 className="m-0 font-heading text-lg font-bold">Second Half Adjustments</h4>
      
      {t.second_half_story.length > 0 && (
        <div className="rounded-r-card border-l-4 border-accent-2 bg-surface-2/50 p-4">
          {t.second_half_story.map((line, i) => (
            <p key={`${i}-${line}`} className="mb-2 text-[0.95rem] leading-relaxed last:mb-0 text-fg/90">{line}</p>
          ))}
        </div>
      )}

      {!sh.available && sh.reason && <p className={ui.empty}>{sh.reason}</p>}
      
      {sh.available && sh.effect && (
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm shadow-sm">
          <span className="font-semibold uppercase tracking-wider text-muted text-[0.7rem]">Did it help?</span>
          <span className="font-bold text-fg">{sh.effect}</span>
        </p>
      )}

      {changes.length > 0 && (
        <motion.ul variants={container} initial="hidden" animate="show" className="grid gap-3 mt-2">
          {changes.map((c) => (
            <motion.li key={c.code} variants={item} className="grid gap-2.5 rounded-card border border-line bg-surface p-4 shadow-sm transition-colors hover:border-surface-3">
              <div className="flex items-start gap-3">
                <DirectionBadge direction={c.direction} />
                <div className="grid gap-1">
                  <p className="m-0 font-bold text-fg">{c.title}</p>
                  <p className="m-0 text-sm text-muted">{c.detail}</p>
                </div>
              </div>
              <div className="ml-9">
                <EvidenceChips ids={c.evidence} highlight={false} />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

function Formation({ f }: { f: FormationEstimate }) {
  const facts = Object.entries(f).filter(
    ([k, v]) => k !== "available" && k !== "reason" && (typeof v === "string" || typeof v === "number"),
  );
  return (
    <div className="mt-8 grid gap-4 border-t border-line pt-6">
      <h4 className="m-0 font-heading text-lg font-bold">Formation & Shape</h4>
      {f.available ? (
        facts.length > 0 && (
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
            {facts.map(([k, v]) => (
              <div key={k} className="flex flex-col justify-center rounded-card border border-line bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-3">
                <dt className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted">{prettyKey(k)}</dt>
                <dd className="m-0 font-heading text-lg font-bold text-fg">{String(v)}</dd>
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
      <h3 className={ui.h3}>Tactical Breakdown</h3>
      
      {loading && <div className="py-6"><Loader label="Loading tactics" /></div>}
      
      {notFound && <p className={ui.empty}>Team not found.</p>}
      
      {error !== null && !notFound && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface-2 p-6">
          <p className="m-0 text-muted">Couldn't load the tactics.</p>
          <Button onClick={retry}>Retry Connection</Button>
        </div>
      )}

      {data && (
        <div className="mt-2">
          {data.tactics.length === 0 ? (
            <p className={ui.empty}>No single style stands out for {data.team}.</p>
          ) : (
            <motion.ul variants={container} initial="hidden" animate="show" className="grid gap-4">
              {data.tactics.map((t: any) => (
                <motion.li key={t.code} variants={item} className="grid gap-3 rounded-card border border-line bg-surface-2 p-5 shadow-sm transition-all hover:border-surface-3 hover:shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                    <h4 className="m-0 font-heading text-[1.1rem] font-bold text-fg">{t.title}</h4>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-widest uppercase",
                        VERDICT[t.verdict] ?? "bg-surface-3 text-fg border border-line",
                      )}
                    >
                      {t.verdict}
                    </span>
                  </div>
                  
                  <p className="m-0 text-[0.95rem] leading-relaxed text-fg/90">{t.detail}</p>
                  
                  {t.principle && (
                    <div className="mt-1 rounded-md bg-surface p-3 text-[0.85rem] text-muted border border-line/50">
                      <span className="font-bold text-fg uppercase tracking-wider text-[0.65rem] block mb-1">The Principle</span>
                      {t.principle}
                    </div>
                  )}
                  
                  <div className="mt-1">
                    <EvidenceChips ids={t.evidence} highlight={false} />
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
          
          <SecondHalf t={data} />
          <Formation f={data.formation} />
          
          <div className="mt-8">
            <ValidationNote />
          </div>
        </div>
      )}
    </section>
  );
}