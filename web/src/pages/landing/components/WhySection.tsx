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
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">Why a model is needed at all</h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Testing every possible pattern forces a very strict bar, so equations alone usually find little. Choosing what to test is where the model helps.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="rounded-card border border-line bg-surface p-6">
          <h3 className="font-heading text-xl font-semibold">Equations only</h3>
          <p className="mt-1 text-sm text-muted">Every pattern tested, one strict bar.</p>
          <div className="mt-6 grid place-items-center rounded-xl bg-surface-2 px-4 py-10 text-center text-muted">
            <X size={28} className="mb-3" aria-hidden="true" />
            No pattern stands out in the minutes before this goal.
          </div>
        </Reveal>

        <Reveal delay={150} className="rounded-card border border-accent/40 bg-surface p-6 shadow-card">
          <h3 className="font-heading text-xl font-semibold">With the model</h3>
          <p className="mt-1 text-sm text-muted">Three well-chosen ideas, each tested against the events. Example only.</p>
          <ul className="mt-5 grid gap-3">
            {ideas.map(({ idea, result, label, Icon, tone }) => (
              <li key={idea} className="rounded-xl bg-surface-2 p-4">
                <Badge tone={tone}><Icon size={14} aria-hidden="true" />{label}</Badge>
                <p className="mt-2 italic">{idea}</p>
                <p className="mt-1 text-sm text-muted">{result}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <p className="mt-6 font-heading text-xl font-semibold">
        The model chooses what to test. The rules decide whether the data agrees.
      </p>
    </section>
  );
}