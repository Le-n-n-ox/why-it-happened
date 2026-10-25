import { ArrowRight, Eye, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { APP_HREF, LANDING_HREF, scrollTo, wrap } from "../config";

// Same order as the page, and ids must match each <section id>.
const links = [
  ["features", "Features"],
  ["why", "Why a model"],
  ["how", "How it works"],
  ["compare", "Compare"],
];

export function LandingNav() {
  const { theme, toggle } = useTheme();
  // True once scrolled past the top. Drives the border and the stronger backdrop.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // correct on mount, e.g. after a refresh mid-page
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-[background-color,border-color] duration-300 ${
        scrolled
          ? "border-b border-line bg-bg/85 backdrop-blur-xl"
          : "border-b border-transparent bg-bg/60 backdrop-blur-sm"
      }`}
    >
      <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
        <a
          href={LANDING_HREF}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group flex min-w-0 items-center gap-2.5 text-fg"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink shadow-card transition-transform duration-300 group-hover:scale-105">
            <Eye size={18} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-heading text-base font-bold tracking-tight">Why It Happened</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
              Match explainer
            </span>
          </span>
        </a>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          {links.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="group relative hidden min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:inline-flex"
            >
              {label}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100"
              />
            </button>
          ))}

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface/70 text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {theme === "light" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>

          <a
            href={APP_HREF}
            className="group ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:px-5"
          >
            Open app
            <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </nav>
      </div>
    </header>
  );
}