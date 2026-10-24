import { ABOUT_HREF, DATA_SOURCE, wrap } from "../config";

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted`}>
        <span>© 2026 Why It Happened{DATA_SOURCE && <> · Data: {DATA_SOURCE}</>}</span>
        <a href={ABOUT_HREF} className="inline-flex min-h-11 items-center hover:text-fg">About</a>
      </div>
    </footer>
  );
}