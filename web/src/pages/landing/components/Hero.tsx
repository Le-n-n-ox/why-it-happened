import { ArrowRight, Check } from "lucide-react";
import { APP_HREF, scrollTo, wrap } from "../config";
import { PitchGraphic } from "../graphics/PitchGraphic";
import { ActionLink } from "./ActionLink";

const chain = [
  "Won the ball high up the pitch",
  "Space opened behind the full-back",
  "A cut-back found a runner at the edge of the box",
  "Finished first time",
];
const promises = ["Evidence on every claim", "The model writes, rules decide", "Falls back to \u201CRules only\u201D"];

export function Hero() {
  return (
    <section className={`${wrap} relative grid items-center gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-24`}>
      {/* Soft accent glow behind the pitch graphic */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 -z-10 h-[520px] w-[520px] rounded-full bg-accent/10 blur-3xl"
      />

      <div className="animate-page-in">
        <h1 className="font-heading text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Know{" "}
          <span className="bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent">
            why
          </span>{" "}
          it happened.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
          Every goal, card and momentum swing, explained in plain language with evidence you can tap and see on the pitch.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ActionLink href={APP_HREF}>
            Open the app{" "}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </ActionLink>
          <ActionLink ghost onClick={() => scrollTo("how")}>See how it works</ActionLink>
        </div>
        <ul className="mt-9 flex flex-wrap gap-2 text-sm">
          {promises.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1.5 text-muted backdrop-blur"
            >
              <Check size={14} className="text-accent" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="animate-page-in relative">
        <PitchGraphic />
        <div className="relative -mt-10 ml-4 mr-4 rounded-card border border-line bg-surface/90 p-4 shadow-card backdrop-blur sm:ml-8 sm:mr-0">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-muted">Sample goal. Why?</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-live/10 px-2.5 py-1 text-xs font-semibold text-live">
              <span className="size-2 rounded-full bg-live animate-pulse-dot" />67&apos;
            </span>
          </div>
          <ol>
            {chain.map((s, i) => (
              <li
                key={s}
                style={{ animationDelay: `${1700 + i * 250}ms` }}
                className="relative ml-1.5 animate-page-in anim-hold border-l border-line pb-3 pl-5 text-sm last:pb-0"
              >
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent" />
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}