// web/src/layout/Sidebar.tsx - desktop sidebar (collapsible) and mobile drawer.
import {
  Activity, BarChart3, ChevronsLeft, Clock, Flag, Heart, History, Info,
  LayoutGrid, ListOrdered, MessageCircle, Mic, Moon, Shield, Sun, Trophy,
  TrendingUp, User, X, type LucideIcon,
} from "lucide-react";
import type { Theme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  path: string;
  label: string;
  Icon: LucideIcon;
  prefixes?: string[];
}[] = [
  // "/" now renders the landing page (see App.tsx), so Live lives at "/live".
  // prefix "/insight/" keeps the Live nav item highlighted when viewing an insight.
  { href: "#/live",       path: "/live",      label: "Live",          Icon: Activity,       prefixes: ["/insight/"] },
  { href: "#/result",     path: "/result",    label: "Why the result", Icon: Trophy },
  { href: "#/momentum",   path: "/momentum",  label: "Momentum",      Icon: TrendingUp },
  { href: "#/halftime",   path: "/halftime",  label: "Half-time",     Icon: Clock },
  { href: "#/recap",      path: "/recap",     label: "Timeline",      Icon: ListOrdered },
  { href: "#/ask",        path: "/ask",       label: "Ask the match", Icon: MessageCircle },
  { href: "#/positions",  path: "/positions", label: "Positions",     Icon: LayoutGrid },
  { href: "#/teams",      path: "/teams",     label: "Teams",         Icon: Shield,         prefixes: ["/team/"] },
  { href: "#/players",    path: "/players",   label: "Players",       Icon: User,           prefixes: ["/player/"] },
  { href: "#/fouls",      path: "/fouls",     label: "Fouls",         Icon: Flag },
  { href: "#/analytics",  path: "/analytics", label: "Analytics",     Icon: BarChart3 },
  { href: "#/announcers", path: "/announcers", label: "Announcers",   Icon: Mic },
  { href: "#/fans",       path: "/fans",      label: "Fans",          Icon: Heart },
  { href: "#/history",    path: "/history",   label: "History",       Icon: History },
  { href: "#/about",      path: "/about",     label: "How it works",  Icon: Info },
];

// Desktop collapse: an ancestor with data-collapsed="true" hides labels and centres icons.
const HIDE_COLLAPSED   = "min-[901px]:[[data-collapsed=true]_&]:hidden";
const CENTER_COLLAPSED =
  "min-[901px]:[[data-collapsed=true]_&]:justify-center min-[901px]:[[data-collapsed=true]_&]:px-0";

const NAV_ITEM =
  "flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left font-medium text-muted transition-colors hover:bg-surface-3 hover:text-fg aria-[current=page]:bg-surface-3 aria-[current=page]:font-semibold aria-[current=page]:text-fg aria-[current=page]:shadow-[inset_3px_0_0_var(--accent)] aria-[current=page]:[&_svg]:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// Mobile: an off-canvas drawer, shown when an ancestor has data-open="true".
const ASIDE = cn(
  "sticky top-0 flex h-dvh flex-col gap-3 self-start overflow-x-hidden overflow-y-auto border-r border-line bg-surface-2 px-3 py-4",
  "max-[900px]:invisible max-[900px]:fixed max-[900px]:inset-y-0 max-[900px]:left-0 max-[900px]:z-40 max-[900px]:w-[min(300px,86vw)] max-[900px]:-translate-x-full max-[900px]:shadow-card max-[900px]:transition-[transform,visibility] max-[900px]:duration-[250ms] max-[900px]:ease-[cubic-bezier(.2,.8,.2,1)]",
  "max-[900px]:[[data-open=true]_&]:visible max-[900px]:[[data-open=true]_&]:translate-x-0",
);

interface Props {
  path: string;
  collapsed: boolean;
  theme: Theme;
  onNavigate: () => void;
  onClose: () => void;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  path, collapsed, theme, onNavigate, onClose, onToggleCollapse, onToggleTheme,
}: Props) {
  return (
    <aside id="sidebar" className={ASIDE} aria-label="Main navigation">
      <div className="flex items-center justify-between gap-2">
        <a
          className={cn(
            "group flex items-center gap-3 whitespace-nowrap rounded-xl p-1.5 font-heading text-[1.05rem] font-bold text-fg transition-colors hover:bg-surface-3",
            "min-[901px]:[[data-collapsed=true]_&]:justify-center",
          )}
          href="#/live"
          onClick={onNavigate}
          aria-label="Why It Happened, live match"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 font-extrabold text-accent-ink shadow-sm ring-1 ring-accent/20 transition-transform group-hover:scale-105"
            aria-hidden="true"
          >
            W
          </span>
          <span className={HIDE_COLLAPSED}>Why It Happened</span>
        </a>

        <button
          type="button"
          className="hidden size-10 place-items-center rounded-[10px] text-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-[900px]:grid"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Pages">
        <ul className="grid gap-1">
          {NAV.map(({ href, path: itemPath, label, Icon: IconComponent, prefixes }) => {
            const active =
              itemPath === path || (prefixes?.some((p) => path.startsWith(p)) ?? false);
            return (
              <li key={href}>
                <a
                  href={href}
                  className={cn(NAV_ITEM, CENTER_COLLAPSED)}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                  onClick={onNavigate}
                >
                  <IconComponent size={18} aria-hidden="true" className="shrink-0" />
                  <span className={HIDE_COLLAPSED}>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto grid gap-1 border-t border-line pt-3">
        <button
          type="button"
          className={cn(NAV_ITEM, CENTER_COLLAPSED)}
          onClick={onToggleTheme}
          title={collapsed ? "Switch theme" : undefined}
        >
          {theme === "dark" ? (
            <Sun size={18} aria-hidden="true" className="shrink-0" />
          ) : (
            <Moon size={18} aria-hidden="true" className="shrink-0" />
          )}
          <span className={HIDE_COLLAPSED}>
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </span>
        </button>

        <button
          type="button"
          className={cn(NAV_ITEM, CENTER_COLLAPSED, "max-[900px]:hidden")}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : undefined}
        >
          <span
            className={cn(
              "shrink-0 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          >
            <ChevronsLeft size={18} aria-hidden="true" />
          </span>
          <span className={HIDE_COLLAPSED}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}