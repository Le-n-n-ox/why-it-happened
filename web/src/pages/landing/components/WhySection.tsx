import { Check, Minus, X } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const ideas = [
  { idea: "The team pressed higher in the minutes before the goal.", result: "More won balls in the opposition half than earlier in the match.", label: "Supported", Icon: Check, tone: "text-c1", bar: "bg-c1", off: false },
  { idea: "A long spell without a shot made the goal a surprise.", result: "Shots came at a similar rate before the goal.", label: "Tested, not supported", Icon: X, tone: "text-accent-2", bar: "bg-accent-2", off: true },
  { idea: "More touches inside the box led to the chance.", result: "Too few events to say.", label: "Too little data", Icon: Minus, tone: "text-warn", bar: "bg-warn", off: false },
];

// Heights (% of the chart) of the patterns in the left card. Illustration only: none reaches the strict bar.
const BARS = [34, 52, 28, 61, 44, 38, 57, 30, 49, 41, 55, 33, 47, 59, 36, 51, 29, 45, 58, 40, 53, 32, 48, 56];
const STRICT = 80; // where the strict bar sits, as % of the chart height

// The wrapper carries data-in="true" once it has been seen: these classes react to it.
const FADE_UP =
  "opacity-0 translate-y-2 transition duration-500 ease-out group-data-[in=true]/why:translate-y-0 group-data-[in=true]/why:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none";
const POP =
  "scale-0 transition-transform duration-500 ease-[cubic-bezier(.2,1.4,.4,1)] group-data-[in=true]/why:scale-100 motion-reduce:scale-100 motion-reduce:transition-none";
const GROW_X =
  "origin-left scale-x-0 transition-transform ease-out group-data-[in=true]/why:scale-x-100 motion-reduce:scale-x-100 motion-reduce:transition-none";
const GROW_Y =
  "origin-bottom scale-y-0 transition-transform duration-700 ease-out group-data-[in=true]/why:scale-y-100 motion-reduce:scale-y-100 motion-reduce:transition-none";

export function WhySection() {
  const [ref, seen] = useInView<HTMLDivElement>({ once: true, threshold: 0.2 });

  return (
    <Section id="why" alt>
      <SectionHead kicker="Why a model" title="Why a model is needed at all">
        Testing every possible pattern forces a very strict bar, so equations alone usually find little.
        Choosing what to test is where the model helps.
      </SectionHead>

      <div ref={ref} data-in={seen} className="group/why">
        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Reveal className="flex flex-col rounded-card border border-line bg-surface p-6">
            <h3 className="font-heading text-xl font-semibold text-fg">Equations only</h3>
            <p className="mt-1 text-sm text-muted">Every pattern tested, one strict bar.</p>

            <div className="mt-6 flex-1 rounded-xl border border-dashed border-line bg-surface-2/40 p-5">
              <div className="relative h-40" aria-hidden="true">
                <div className="absolute inset-0 flex items-end gap-1">
                  {BARS.map((h, i) => (
                    <span
                      key={`${i}-${h}`}
                      className={cn("block flex-1 rounded-t-sm bg-surface-3", GROW_Y)}
                      style={{ height: `${h}%`, transitionDelay: `${i * 30}ms` }}
                    />
                  ))}
                </div>
                <div
                  className={cn("absolute inset-x-0 border-t-2 border-dashed border-accent-2/70 duration-[800ms]", GROW_X)}
                  style={{ bottom: `${STRICT}%`, transitionDelay: "1000ms" }}
                />
                <span
                  className={cn("absolute right-0 rounded bg-accent-2/15 px-1.5 py-px text-[.65rem] font-semibold text-accent-2", FADE_UP)}
                  style={{ bottom: `calc(${STRICT}% + 4px)`, transitionDelay: "1500ms" }}
                >
                  strict bar
                </span>
                <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity delay-1000 group-data-[in=true]/why:opacity-100 motion-reduce:hidden">
                  <div className="h-full w-1/3 animate-scan bg-gradient-to-r from-transparent via-fg/10 to-transparent" />
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 text-muted">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface">
                  <X size={16} aria-hidden="true" />
                </span>
                <p className="m-0 max-w-[30ch] text-sm leading-relaxed">
                  No pattern stands out in the minutes before this goal.
                </p>
              </div>
              <p className="mt-3 text-[.7rem] text-muted/80">Illustration: each bar is one pattern tested.</p>
            </div>
          </Reveal>

          <Reveal delay={150} className="rounded-card border border-accent/40 bg-surface p-6 shadow-card">
            <h3 className="font-heading text-xl font-semibold text-fg">With the model</h3>
            <p className="mt-1 text-sm text-muted">Three well-chosen ideas, each tested against the events. Example only.</p>
            <ul className="mt-5 grid gap-3">
              {ideas.map(({ idea, result, label, Icon, tone, bar, off }, i) => {
                const test = 700 + i * 750; // when this idea's test starts, in ms
                return (
                  <li
                    key={idea}
                    className={cn("rounded-xl border border-transparent bg-surface-2 p-4 hover:border-line", FADE_UP)}
                    style={{ transitionDelay: `${i * 160}ms` }}
                  >
                    <div className={off ? "opacity-70" : undefined}>
                      {/* Contract order: the idea (model, italic), the badge, then what the data showed (rules) */}
                      <p className="m-0 text-[0.95rem] italic leading-relaxed text-fg">
                        <span className="sr-only">Idea: </span>
                        {idea}
                      </p>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line/60" aria-hidden="true">
                        <span
                          className={cn("block h-full rounded-full duration-[900ms]", bar, GROW_X)}
                          style={{ transitionDelay: `${test}ms` }}
                        />
                      </div>
                      <div className="mt-3">
                        <span className={cn("inline-block", POP)} style={{ transitionDelay: `${test + 900}ms` }}>
                          <Badge tone={tone}>
                            <Icon size={14} aria-hidden="true" />
                            {label}
                          </Badge>
                        </span>
                      </div>
                      <p
                        className={cn("m-0 mt-2 text-sm leading-relaxed text-muted", FADE_UP)}
                        style={{ transitionDelay: `${test + 1100}ms` }}
                      >
                        <span className="sr-only">What the data showed: </span>
                        {result}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={100} className="mt-10">
          <p className="relative m-0 overflow-hidden rounded-r-card bg-surface-2/50 p-5 pl-6 font-heading text-lg font-semibold leading-relaxed text-fg sm:text-xl">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-accent transition-transform delay-[1600ms] duration-700 group-data-[in=true]/why:scale-y-100 motion-reduce:scale-y-100 motion-reduce:transition-none"
            />
            The model chooses what to test.{" "}
            <span className="bg-[linear-gradient(var(--accent),var(--accent))] bg-[length:0%_2px] bg-[position:0_100%] bg-no-repeat pb-0.5 text-accent transition-[background-size] delay-[2200ms] duration-1000 group-data-[in=true]/why:bg-[length:100%_2px] motion-reduce:bg-[length:100%_2px] motion-reduce:transition-none">
              The rules decide whether the data agrees.
            </span>
          </p>
        </Reveal>
      </div>
    </Section>
  );
}