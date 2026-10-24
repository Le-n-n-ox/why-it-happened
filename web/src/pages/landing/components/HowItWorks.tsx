import { Brain, CornerDownRight, Database, Eye, GitBranch, ShieldCheck } from "lucide-react";
import { wrap } from "../config";
import { Badge } from "./Badge";
import { Reveal } from "./Reveal";

const steps = [
  { icon: Database, t: "The feed gives events", d: "Who did what, where and when." },
  { icon: GitBranch, t: "Rules find the patterns", d: "They build the cause chains. No model is involved yet." },
  { icon: Brain, t: "The model finds the words", d: "It only puts the facts into words, and may cite only real event ids." },
  { icon: ShieldCheck, t: "Checks reject inventions", d: "Any event id, number or name that is not in the facts is thrown out." },
  { icon: Eye, t: "You see it, with a badge", d: "Every sentence says whether the model or the rules wrote it." },
];

export function HowItWorks() {
  return (
    <section id="how" className={`${wrap} py-16 lg:py-24`}>
      <Reveal>
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Process</span>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            How an explanation is made
          </h2>
          <p className="mt-4 text-lg text-muted">
            Nothing is invented. The model is the last step before you, never the first.
          </p>
        </div>
      </Reveal>

      <ol className="relative mt-12 grid gap-8 lg:grid-cols-5 lg:gap-5">
        <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-line lg:block">
          <div className="landing-flow h-full animate-shimmer" />
        </div>

        {steps.map(({ icon: Icon, t, d }, i) => (
          <li key={t}>
            <Reveal delay={i * 120} className="group relative">
              <span className="relative grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-accent shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-card">
                <Icon size={24} aria-hidden="true" />
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink shadow-sm">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-4 font-heading text-lg font-semibold text-fg">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
            </Reveal>
          </li>
        ))}
      </ol>

      <Reveal delay={200} className="mt-10 lg:ml-[40%]">
        <div className="flex items-start gap-3 rounded-card border border-dashed border-warn/40 bg-warn/5 p-5">
          <CornerDownRight className="mt-1 shrink-0 text-warn" size={20} aria-hidden="true" />
          <p className="text-muted">
            <span className="font-semibold text-fg">If a check fails or the model is down,</span>{" "}
            a rules sentence is shown instead, with a{" "}
            <Badge tone="text-warn">Rules only</Badge> badge. The facts are the same.
          </p>
        </div>
      </Reveal>
    </section>
  );
}