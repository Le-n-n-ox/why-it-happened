import { ArrowRight } from "lucide-react";
import { APP_HREF, wrap } from "../config";
import { ActionLink } from "./ActionLink";
import { Reveal } from "./Reveal";

export function LandingCta() {
  return (
    <section className={`${wrap} pb-20 lg:pb-24`}>
      <Reveal className="relative overflow-hidden rounded-card border border-line bg-surface-2 px-6 py-14 text-center sm:py-20">
        {/* Twin corner glows — primary top-right, secondary bottom-left for balance */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -bottom-16 size-56 rounded-full bg-accent-2/15 blur-3xl"
        />

        <span className="relative text-xs font-bold uppercase tracking-[0.14em] text-accent">
          Get started
        </span>

        <h2 className="relative mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          Pick a match and find out why.
        </h2>

        <div className="relative mt-9 flex justify-center">
          <ActionLink href={APP_HREF}>
            Open the app{" "}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </ActionLink>
        </div>
      </Reveal>
    </section>
  );
}