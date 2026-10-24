import type { ReactNode } from "react";

type Props = { children: ReactNode; href?: string; onClick?: () => void; ghost?: boolean };

const base =
  "group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-7 font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0";
const solid =
  "bg-accent text-accent-ink shadow-[0_10px_30px_-10px_var(--accent)] hover:shadow-[0_14px_36px_-8px_var(--accent)] before:absolute before:inset-0 before:-translate-x-full before:skew-x-12 before:bg-white/35 before:transition-transform before:duration-700 hover:before:translate-x-full";
const ghostLook =
  "border border-line bg-surface/60 text-fg backdrop-blur hover:border-accent hover:text-accent";

/** A link (href) or a button (onClick) with the landing button style. */
export function ActionLink({ children, href, onClick, ghost }: Props) {
  const cls = `${base} ${ghost ? ghostLook : solid}`;
  const inner = <span className="relative inline-flex items-center gap-2">{children}</span>;
  return href ? (
    <a href={href} className={cls}>{inner}</a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}