import { Eye } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ABOUT_HREF, APP_HREF, DATA_SOURCE, LANDING_HREF, wrap } from "../config";
import { FADE_UP, GROW_X, at } from "../motion";
import { Sequence } from "./Sequence";

const STATSBOMB_URL = "https://github.com/statsbomb/open-data";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group relative inline-flex min-h-8 w-fit items-center rounded-sm text-sm font-medium text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {children}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
    </a>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line/60 bg-surface-2/30">
      <Sequence threshold={0.1} className="relative">
        {/* An accent hairline draws across the top edge once the footer is in view */}
        <div aria-hidden="true" className={cn("absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent duration-[1400ms]", GROW_X)} />

        <div className={`${wrap} flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between`}>
          <div className={cn("max-w-sm", FADE_UP)}>
            <a href={LANDING_HREF} className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink shadow-card">
                <Eye size={18} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="font-heading text-base font-bold tracking-tight">Why It Happened</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Explains a football match from its events: the chain of causes behind each goal, card and swing, with the evidence attached.
            </p>
          </div>

          <nav aria-label="Footer" className={cn("flex flex-col gap-1.5", FADE_UP)} style={at(150)}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Explore</p>
            <FooterLink href={APP_HREF}>Open the app</FooterLink>
            <FooterLink href={ABOUT_HREF}>About</FooterLink>
          </nav>
        </div>

        <div className={cn("border-t border-line/60", FADE_UP)} style={at(300)}>
          <div className={`${wrap} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-xs text-muted`}>
            <span>© {new Date().getFullYear()} Why It Happened</span>
            {DATA_SOURCE && (
              <span>
                Event data:{" "}
                {/statsbomb/i.test(DATA_SOURCE) ? (
                  <a href={STATSBOMB_URL} target="_blank" rel="noreferrer noopener" className="font-medium underline-offset-2 hover:text-fg hover:underline">
                    {DATA_SOURCE}
                  </a>
                ) : (
                  DATA_SOURCE
                )}
              </span>
            )}
          </div>
        </div>
      </Sequence>
    </footer>
  );
}