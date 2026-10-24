import { ArrowRight } from "lucide-react";
import { APP_HREF, wrap } from "../config";
import { ActionLink } from "./ActionLink";
import { Reveal } from "./Reveal";

export function LandingCta() {
  return (
    <section className={`${wrap} pb-20`}>
      <Reveal className="relative overflow-hidden rounded-card border border-line bg-surface-2 px-6 py-14 text-center sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/15 blur-3xl" />
        <h2 className="relative font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          Pick a match and find out why.
        </h2>
        <div className="relative mt-8 flex justify-center">
          <ActionLink href={APP_HREF}>
            Open the app <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </ActionLink>
        </div>
      </Reveal>
    </section>
  );
}