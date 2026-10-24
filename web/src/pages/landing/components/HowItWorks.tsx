import { Brain, CornerDownRight, Database, Eye, GitBranch, ShieldCheck } from "lucide-react";
import { Badge } from "./Badge";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const steps = [
  { icon: Database, t: "The feed gives events", d: "Who did what, where and when." },
  { icon: GitBranch, t: "Rules find the patterns", d: "They build the cause chains. No model is involved yet." },
  { icon: Brain, t: "The model finds the words", d: "It only puts the facts into words, and may cite only real event ids." },
  { icon: ShieldCheck, t: "Checks reject inventions", d: "Any event id, number or name that is not in the facts is thrown out." },
  { icon: Eye, t: "You see it, with a badge", d: "Every sentence says whether the model or the rules wrote it." },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <SectionHead kicker="Process" title="How an explanation is made">
        Nothing is invented. The model is the last step before you, never the first.
      </SectionHead>

      <div className="relative mt-12">
        {/* Desktop connector: a quiet line with a glow travelling along it */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[10%] right-[10%] top-7 hidden h-0.5 overflow-hidden rounded-full bg-line lg:block"
        >
          <div className="lp-flow h-full" />
        </div>

        <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-5">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="relative">
              {/* Mobile connector: this step's icon down to the next one */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-7 top-7 h-[calc(100%+2rem)] w-0.5 -translate-x-1/2 rounded-full bg-line lg:hidden"
                />
              )}
              <Reveal delay={i * 120} className="group relative pl-[4.5rem] lg:pl-0 lg:text-center">
                <span className="absolute left-0 top-0 grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-accent shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-card lg:relative lg:mx-auto">
                  <Icon size={24} aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink shadow-sm">
                    {i + 1}
                  </span>
                </span>
                <h3 className="font-heading text-lg font-semibold text-fg lg:mt-4">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      {/* The fallback branches off step 4 */}
      <div className="relative mt-10">
        <div
          aria-hidden="true"
          className="absolute -top-10 left-[70%] hidden h-10 border-l border-dashed border-warn/50 lg:block"
        />
        <Reveal delay={200} className="lg:ml-[40%]">
          <div className="flex items-start gap-3 rounded-card border border-dashed border-warn/40 bg-warn/5 p-5">
            <CornerDownRight className="mt-1 shrink-0 text-warn" size={20} aria-hidden="true" />
            <p className="text-muted">
              <span className="font-semibold text-fg">If a check fails or the model is down,</span>{" "}
              a rules sentence is shown instead, with a <Badge tone="text-warn">Rules only</Badge> badge. The facts are the same.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}