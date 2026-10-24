import { Check, Minus, X } from "lucide-react";
import { Badge } from "./Badge";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const ideas = [
  { idea: "The team pressed higher in the minutes before the goal.", result: "More won balls in the opposition half than earlier in the match.", label: "Supported", Icon: Check, tone: "text-c1", off: false },
  { idea: "A long spell without a shot made the goal a surprise.", result: "Shots came at a similar rate before the goal.", label: "Tested, not supported", Icon: X, tone: "text-accent-2", off: true },
  { idea: "More touches inside the box led to the chance.", result: "Too few events to say.", label: "Too little data", Icon: Minus, tone: "text-warn", off: false },
];

export function WhySection() {
  return (
    <Section id="why" alt>
      <SectionHead kicker="Why a model" title="Why a model is needed at all">
        Testing every possible pattern forces a very strict bar, so equations alone usually find little.
        Choosing what to test is where the model helps.
      </SectionHead>

      <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="flex flex-col rounded-card border border-line bg-surface p-6">
          <h3 className="font-heading text-xl font-semibold text-fg">Equations only</h3>
          <p className="mt-1 text-sm text-muted">Every pattern tested, one strict bar.</p>
          <div className="mt-6 grid flex-1 place-items-center rounded-xl border border-dashed border-line bg-surface-2/40 px-6 py-10 text-center text-muted">
            <div>
              <span className="mx-auto grid size-10 place-items-center rounded-full border border-line bg-surface">
                <X size={18} aria-hidden="true" />
              </span>
              <p className="mt-4 max-w-[26ch] text-sm leading-relaxed">
                No pattern stands out in the minutes before this goal.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={150} className="rounded-card border border-accent/40 bg-surface p-6 shadow-card">
          <h3 className="font-heading text-xl font-semibold text-fg">With the model</h3>
          <p className="mt-1 text-sm text-muted">Three well-chosen ideas, each tested against the events. Example only.</p>
          <ul className="mt-5 grid gap-3">
            {ideas.map(({ idea, result, label, Icon, tone, off }) => (
              <li
                key={idea}
                className={`rounded-xl border border-transparent bg-surface-2 p-4 transition-colors hover:border-line ${off ? "opacity-70" : ""}`}
              >
                {/* Contract order: the idea (model, italic), the badge, then what the data showed (rules) */}
                <p className="text-[0.95rem] italic leading-relaxed text-fg">
                  <span className="sr-only">Idea: </span>
                  {idea}
                </p>
                <div className="mt-2">
                  <Badge tone={tone}>
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  <span className="sr-only">What the data showed: </span>
                  {result}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal delay={100} className="mt-10">
        <p className="rounded-r-card border-l-4 border-accent bg-surface-2/50 p-5 font-heading text-lg font-semibold leading-relaxed text-fg sm:text-xl">
          The model chooses what to test. <span className="text-accent">The rules decide whether the data agrees.</span>
        </p>
      </Reveal>
    </Section>
  );
}