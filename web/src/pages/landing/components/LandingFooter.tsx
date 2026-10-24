import { ABOUT_HREF, DATA_SOURCE, wrap } from "../config";

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div
        className={`${wrap} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-10 text-sm text-muted`}
      >
        <span>
          © 2026 Why It Happened{DATA_SOURCE && <> · Data: {DATA_SOURCE}</>}
        </span>

        <a
          href={ABOUT_HREF}
          className="group relative inline-flex min-h-11 items-center rounded-sm font-medium transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          About
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-2.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100"
          />
        </a>
      </div>
    </footer>
  );
}