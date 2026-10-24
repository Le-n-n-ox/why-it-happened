import { ArrowRight, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { APP_HREF, scrollTo, wrap } from "../config";

const links = [
  ["how", "How it works"],
  ["why", "Why a model"],
  ["compare", "Compare"],
];

export function LandingNav() {
  // True once the user has scrolled past the fold edge. Drives the border + stronger backdrop.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // set correct state on mount (e.g. after refresh mid-page)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-[background-color,border-color] duration-300 ${
        scrolled
          ? "border-b border-line bg-bg/85 backdrop-blur-md"
          : "border-b border-transparent bg-bg/60 backdrop-blur-sm"
      }`}
    >
      <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
        {/* Logo — group so the badge can react to hovering the whole wordmark */}
        <a
          href="#/welcome"
          className="group flex items-center gap-2.5 font-heading text-lg font-bold text-fg"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink transition-transform duration-300 group-hover:scale-105">
            <Eye size={18} aria-hidden="true" />
          </span>
          <span className="tracking-tight">Why It Happened</span>
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

          <a
            href={APP_HREF}
            className="group ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:ml-2 sm:px-5"
          >
            Open app
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </a>
        </nav>
      </div>
    </header>
  );
}