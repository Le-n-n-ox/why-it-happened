import { Eye } from "lucide-react";
import { APP_HREF, scrollTo, wrap } from "../config";

const links = [
  ["how", "How it works"],
  ["why", "Why a model"],
  ["compare", "Compare"],
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
      <div className={`${wrap} flex h-16 items-center justify-between`}>
        <a href="#/welcome" className="flex items-center gap-2 font-heading text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
            <Eye size={18} aria-hidden="true" />
          </span>
          Why It Happened
        </a>
        <nav className="flex items-center gap-1 sm:gap-4">
          {links.map(([id, label]) => (
            <button key={id} type="button" onClick={() => scrollTo(id)} className="hidden min-h-11 px-2 text-muted hover:text-fg md:block">
              {label}
            </button>
          ))}
          <a href={APP_HREF} className="inline-flex min-h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:brightness-110">
            Open app
          </a>
        </nav>
      </div>
    </header>
  );
}