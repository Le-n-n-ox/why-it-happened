import { useState } from "react";
import { ArrowRight, Eye } from "lucide-react";
import { APP_HREF, scrollTo, wrap } from "../config";
import { PitchGraphic } from "../graphics/PitchGraphic";
import { ActionLink } from "./ActionLink";

const chain = [
  "Won the ball high up the pitch",
  "Space opened behind the full-back",
  "A cut-back found a runner at the edge of the box",
  "Finished first time",
];

const ids = ["d17", "d18", "d19", "d20"]; // same ids the pitch shows

const stats = [
  ["5", "Steps from event to sentence"],
  ["3", "Ideas tested per goal, at most"],
  ["2", "Badges: model or rules"],
  ["1", "Rule: evidence on every claim"],
];

const MASK = "radial-gradient(80% 60% at 50% 30%, #000 30%, transparent 78%)";
const rise = "animate-page-in anim-hold";
const at = (ms: number) => ({ animationDelay: `${ms}ms` });

export function Hero() {
  const [step, setStep] = useState(0); // how many "Why?" steps the pitch animation has reached

  return (
    <section className="relative isolate overflow-hidden pb-16 pt-10 sm:pt-16 lg:pb-24 lg:pt-20">
      {/* Full-width backdrop: two soft glows and a faded grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="lp-orb absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--accent) 24%, transparent), transparent 68%)" }}
        />
        <div
          className="lp-orb-slow absolute -right-40 top-24 h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--accent-2) 14%, transparent), transparent 68%)" }}
        />
        <div className="lp-grid absolute inset-0 opacity-40" style={{ maskImage: MASK, WebkitMaskImage: MASK }} />
      </div>

      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16`}>
        <div>
          <div
            style={at(0)}
            className={`${rise} inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-xs font-semibold text-muted shadow-card backdrop-blur`}
          >
            <Eye size={14} className="text-accent" aria-hidden="true" />
            Football match explainer
            <span className="size-1 rounded-full bg-line" aria-hidden="true" />
            Evidence on every claim
          </div>

          <h1
            style={at(100)}
            className={`${rise} mt-6 font-heading text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl`}
          >
            Know <span className="text-accent">why</span> it happened.
          </h1>

          <p style={at(200)} className={`${rise} mt-6 max-w-xl text-lg text-muted sm:text-xl`}>
            Every goal, card and momentum swing, explained in plain language. Rules find the patterns, a model puts the
            facts into words, and checks reject anything that is not in the data. Tap any claim to see its evidence on the pitch.
          </p>

          <div style={at(300)} className={`${rise} mt-9 flex flex-wrap gap-3`}>
            <ActionLink href={APP_HREF}>
              Open the app{" "}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </ActionLink>
            <ActionLink ghost onClick={() => scrollTo("how")}>See how it works</ActionLink>
          </div>

          <dl style={at(400)} className={`${rise} mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4`}>
            {stats.map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block font-heading text-2xl font-bold tracking-tight">{n}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-page-in">
          <PitchGraphic onStep={setStep} />
          <div className="relative -mt-10 ml-4 mr-4 rounded-card border border-line bg-surface/90 p-4 shadow-card backdrop-blur sm:ml-8 sm:mr-0">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-muted">Sample goal. Why?</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-live/10 px-2.5 py-1 text-xs font-semibold text-live">
                <span className="size-2 rounded-full bg-live animate-pulse-dot" aria-hidden="true" />
                9&apos;
              </span>
            </div>
            <ol>
              {chain.map((s, i) => (
                <li
                  key={s}
                  className={`relative ml-1.5 border-l border-line pb-3 pl-5 text-sm transition duration-500 last:pb-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
                    i < step ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                >
                  <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent" aria-hidden="true" />
                  {s}
                  <span className="ml-2 rounded-full bg-bg px-2 py-px font-mono text-[11px] text-muted ring-1 ring-line">{ids[i]}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}