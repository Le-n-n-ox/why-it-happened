import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE_UP, POP, at } from "../motion";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";
import { Sequence } from "./Sequence";

const rows: [string, string, string][] = [
  ["What you get", "Scores, stats and charts", "The cause chain behind each event: trigger, development, payoff, consequence"],
  ["Proof", "A claim you take on trust", "Evidence chips on every claim that light up the pitch"],
  ["AI writing", "Free text that can say anything", "The model only phrases facts. Invented event ids, numbers and names are rejected"],
  ["When data can't answer", "A confident guess", "\u201CThe match data cannot answer this\u201D, with the reason"],
  ["Intent", "Reads a coach's or player's mind", "Never states intent. It judges the result of a way of playing"],
  ["The full story", "Tells the winner's story", "Shows what held the winner back too"],
];

const STAGGER = 90; // ms between rows

/** A check or a cross. The shape carries the meaning, so colour is not the only signal. */
function Mark({ ok, delay }: { ok: boolean; delay: number }) {
  const Icon = ok ? Check : X;
  return (
    <span
      className={cn(
        "mr-2.5 inline-grid size-5 shrink-0 place-items-center rounded-full align-[-4px]",
        ok ? "bg-accent/15 text-accent" : "bg-accent-2/15 text-accent-2",
        POP,
      )}
      style={at(delay)}
    >
      <Icon size={12} strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

export function DifferenceSection() {
  return (
    <Section id="compare" alt>
      <Sequence threshold={0.15}>
        <SectionHead kicker="Comparison" title="How it differs from other apps" />
        <span
          aria-hidden="true"
          className="mt-4 block h-1 w-20 origin-left scale-x-0 rounded-full bg-gradient-to-r from-accent to-accent-2 transition-transform duration-700 ease-out group-data-[in=true]/seq:scale-x-100 motion-reduce:scale-x-100 motion-reduce:transition-none"
        />

        {/* From 768px up: a table */}
        <Reveal delay={100} className="mt-10 hidden overflow-hidden rounded-card border border-line bg-surface shadow-card md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">How Why It Happened compares with typical stats and AI-summary apps</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-sm">
                  <th scope="col" className="p-4 font-medium text-muted"><span className="sr-only">Topic</span></th>
                  <th scope="col" className="p-4 font-medium text-muted">Typical stats and AI-summary apps</th>
                  <th scope="col" className="border-l border-accent/30 bg-accent/10 p-4 font-heading text-base font-semibold shadow-[inset_0_-2px_0_var(--accent)]">
                    <span className="inline-flex items-center gap-2 text-accent">
                      <span className="size-1.5 animate-pulse-dot rounded-full bg-accent" aria-hidden="true" />
                      Why It Happened
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([topic, other, ours], i) => (
                  <tr key={topic} className="group/row border-b border-line transition-colors last:border-0 hover:bg-surface-2/40">
                    <th
                      scope="row"
                      className="relative p-4 align-top font-semibold text-fg before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:scale-y-0 before:rounded-full before:bg-accent before:transition-transform group-hover/row:before:scale-y-100"
                    >
                      <div className={FADE_UP} style={at(250 + i * STAGGER)}>{topic}</div>
                    </th>
                    <td className="p-4 align-top text-muted">
                      <div className={FADE_UP} style={at(300 + i * STAGGER)}>
                        <Mark ok={false} delay={420 + i * STAGGER} />
                        {other}
                      </div>
                    </td>
                    <td className="border-l border-accent/30 bg-accent/5 p-4 align-top text-fg">
                      <div className={FADE_UP} style={at(350 + i * STAGGER)}>
                        <Mark ok delay={520 + i * STAGGER} />
                        {ours}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Sequence>

      {/* Below 768px: one card per row, each revealed as it scrolls into view */}
      <ul className="mt-10 grid gap-3 md:hidden">
        {rows.map(([topic, other, ours], i) => (
          <li key={topic}>
            <Reveal delay={i % 2 ? 80 : 0} className="grid gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
              <h3 className="m-0 text-base font-bold">{topic}</h3>
              <p className="m-0 flex items-start text-muted">
                <span className="mr-2.5 inline-grid size-5 shrink-0 place-items-center rounded-full bg-accent-2/15 text-accent-2">
                  <X size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[.7rem] font-semibold uppercase tracking-wider">Typical apps</span>
                  {other}
                </span>
              </p>
              <p className="m-0 flex items-start rounded-xl border border-accent/30 bg-accent/10 p-3 text-fg">
                <span className="mr-2.5 inline-grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[.7rem] font-semibold uppercase tracking-wider text-accent">Why It Happened</span>
                  {ours}
                </span>
              </p>
            </Reveal>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted">A general comparison of approaches. No specific app is named.</p>
    </Section>
  );
}