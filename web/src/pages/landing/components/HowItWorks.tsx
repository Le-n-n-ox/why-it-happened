import { Brain, Check, CornerDownRight, Database, Eye, GitBranch, ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FADE_UP, GROW_X, GROW_Y, POP, at } from "../motion";
import { Badge } from "./Badge";
import { Section, SectionHead } from "./Section";
import { Sequence } from "./Sequence";

const START = 200; // ms before the line starts filling
const STEP = 600; // ms for the line to travel from one step to the next
const chip = "inline-flex items-center gap-1 rounded-full bg-surface px-2 py-px font-mono text-[11px] text-muted ring-1 ring-line";
const row = "flex flex-wrap gap-1.5 lg:justify-center";

// Small evidence graphics under each step. d17 to d20 are the contract's counter-attack example.
const steps: { icon: typeof Database; t: string; d: string; art: ReactNode }[] = [
  {
    icon: Database, t: "The feed gives events", d: "Who did what, where and when.",
    art: <div className={row}>{["d17", "d18", "d19", "d20"].map((c) => <span key={c} className={chip}>{c}</span>)}</div>,
  },
  {
    icon: GitBranch, t: "Rules find the patterns", d: "They build the cause chains. No model is involved yet.",
    art: <div className={row}><span className={chip}>d17 → d18 → d20</span></div>,
  },
  {
    icon: Brain, t: "The model finds the words", d: "It only puts the facts into words, and may cite only real event ids.",
    art: (
      <div className="grid w-28 gap-1.5 lg:mx-auto">
        <span className="h-1.5 w-full rounded bg-surface-3" />
        <span className="h-1.5 w-4/5 rounded bg-surface-3" />
        <span className={cn(chip, "w-fit")}>cites d18</span>
      </div>
    ),
  },
  {
    icon: ShieldCheck, t: "Checks reject inventions", d: "Any event id, number or name that is not in the facts is thrown out.",
    art: (
      <div className={row}>
        <span className={cn(chip, "text-live")}><X size={11} aria-hidden="true" /><s>d99</s></span>
        <span className={cn(chip, "text-ok")}><Check size={11} aria-hidden="true" />d18</span>
      </div>
    ),
  },
  {
    icon: Eye, t: "You see it, with a badge", d: "Every sentence says whether the model or the rules wrote it.",
    art: <div className={row}><Badge tone="text-accent">Model</Badge><Badge tone="text-warn">Rules only</Badge></div>,
  },
];

export function HowItWorks() {
  const last = steps.length - 1;
  return (
    <Section id="how">
      <SectionHead kicker="Process" title="How an explanation is made">
        Nothing is invented. The model is the last step before you, never the first.
      </SectionHead>

      <Sequence threshold={0.15} className="relative mt-14">
        {/* Desktop: a line that fills across the steps, with a glowing dot travelling along it */}
        <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 rounded-full bg-line lg:block">
          <div className={cn("h-full rounded-full bg-accent ease-linear", GROW_X)} style={{ transitionDuration: `${last * STEP}ms`, ...at(START) }} />
          <span
            className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-[left] ease-linear group-data-[in=true]/seq:left-full motion-reduce:hidden"
            style={{ transitionDuration: `${last * STEP}ms`, ...at(START) }}
          />
        </div>

        <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-5">
          {steps.map(({ icon: Icon, t, d, art }, i) => {
            const reached = START + i * STEP; // when the line arrives at this step
            return (
              <li key={t} className="relative pl-[4.5rem] lg:pl-0 lg:text-center">
                {/* Mobile: a segment from this icon down to the next one */}
                {i < last && (
                  <span
                    aria-hidden="true"
                    className={cn("absolute -bottom-8 left-7 top-14 w-0.5 -translate-x-1/2 rounded-full bg-accent lg:hidden", GROW_Y)}
                    style={{ transitionDuration: `${STEP - 150}ms`, ...at(reached + 100) }}
                  />
                )}
                <span
                  className={cn("absolute left-0 top-0 grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-accent shadow-sm lg:relative lg:mx-auto", POP)}
                  style={at(Math.max(0, reached - 150))}
                >
                  <Icon size={24} aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink shadow-sm">{i + 1}</span>
                </span>
                <div className={cn("pt-1 lg:pt-4", FADE_UP)} style={at(reached + 50)}>
                  <h3 className="font-heading text-lg font-semibold text-fg">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
                </div>
                <div className={cn("mt-3", FADE_UP)} style={at(reached + 300)}>{art}</div>
              </li>
            );
          })}
        </ol>

        {/* The fallback branches off step 4 */}
        <div className="relative mt-10">
          <span
            aria-hidden="true"
            className={cn("absolute -top-10 left-[70%] hidden h-10 border-l border-dashed border-warn/50 duration-500 lg:block", GROW_Y)}
            style={at(START + 3 * STEP + 400)}
          />
          <div className={cn("flex items-start gap-3 rounded-card border border-dashed border-warn/40 bg-warn/5 p-5 lg:ml-[40%]", FADE_UP)} style={at(START + 3 * STEP + 700)}>
            <CornerDownRight className="mt-1 shrink-0 text-warn" size={20} aria-hidden="true" />
            <p className="text-muted">
              <span className="font-semibold text-fg">If a check fails or the model is down,</span>{" "}
              a rules sentence is shown instead, with a <Badge tone="text-warn">Rules only</Badge> badge. The facts are the same.
            </p>
          </div>
        </div>
      </Sequence>
    </Section>
  );
}