import { Check, Minus, X } from "lucide-react";
import { wrap } from "../config";
import { Badge } from "./Badge";
import { Reveal } from "./Reveal";

const ideas = [
  { idea: "The team pressed higher in the minutes before the goal.", result: "More won balls in the opposition half than earlier in the match.", label: "Supported", Icon: Check, tone: "text-c1" },
  { idea: "A long spell without a shot made the goal a surprise.", result: "Shots came at a similar rate before the goal.", label: "Tested, not supported", Icon: X, tone: "text-accent-2" },
  { idea: "More touches inside the box led to the chance.", result: "Too few events to say.", label: "Too little data", Icon: Minus, tone: "text-warn" },
];

export function WhySection() {
  return (
    <section id="why" className={`${wrap} py-16 lg:py-24`}>
      <Reveal>
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Why a model</span>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Why a model is needed at all
          </h2>
          <p className="mt-4 text-lg text-muted">
            Testing every possible pattern forces a very strict bar, so equations alone usually find little.
            Choosing what to test is where the model helps.
          </p>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: equations only — deliberately understated */}
        <Reveal className="flex flex-col rounded-card border border-line bg-surface p-6">
          <div>
            <h3 className="font-heading text-xl font-semibold text-fg">Equations only</h3>
            <p className="mt-1 text-sm text-muted">Every pattern tested, one strict bar.</p>
          </div>
          <div className="mt-6 grid flex-1 place-items-center rounded-xl border border-dashed border-line bg-surface-2/40 px-6 py-10 text-center text-muted">
            <div>
              <span className="mx-auto grid size-10 place-items-center rounded-full border border-line bg-surface text-muted">
                <X size={18} aria-hidden="true" />
              </span>
              <p className="mt-4 max-w-[26ch] text-sm leading-relaxed">
                No pattern stands out in the minutes before this goal.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Right: with the model — accent border, subtle lift */}
        <Reveal delay={150} className="rounded-card border border-accent/40 bg-surface p-6 shadow-card">
          <div>
            <h3 className="font-heading text-xl font-semibold text-fg">With the model</h3>
            <p className="mt-1 text-sm text-muted">
              Three well-chosen ideas, each tested against the events. Example only.
            </p>
          </div>
          <ul className="mt-5 grid gap-3">
            {ideas.map(({ idea, result, label, Icon, tone }) => (
              <li
                key={idea}
                className="rounded-xl border border-transparent bg-surface-2 p-4 transition-colors hover:border-line"
              >
                <Badge tone={tone}>
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </Badge>
                <p className="mt-2 text-[0.95rem] italic leading-relaxed text-fg">{idea}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{result}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal delay={100} className="mt-10">
        <p className="rounded-r-card border-l-4 border-accent bg-surface-2/50 p-5 font-heading text-lg font-semibold leading-relaxed text-fg sm:text-xl">
          The model chooses what to test.{" "}
          <span className="text-accent">The rules decide whether the data agrees.</span>
        </p>
      </Reveal>
    </section>
  );
}