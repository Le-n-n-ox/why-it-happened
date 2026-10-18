// web/src/layout/Sidebar.tsx - desktop sidebar (collapsible) and mobile drawer.
import { Icon, type IconName } from "@/components/icons";
import type { Theme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const NAV: { href: string; path: string; label: string; icon: IconName; prefixes?: string[] }[] = [
  { href: "#/", path: "/", label: "Live", icon: "live", prefixes: ["/insight/"] },
  { href: "#/result", path: "/result", label: "Why the result", icon: "result" },
  { href: "#/recap", path: "/recap", label: "Timeline", icon: "timeline" },
  { href: "#/teams", path: "/teams", label: "Teams", icon: "teams", prefixes: ["/team/"] },
  { href: "#/players", path: "/players", label: "Players", icon: "players", prefixes: ["/player/"] },
  { href: "#/fouls", path: "/fouls", label: "Fouls", icon: "fouls" },
  { href: "#/analytics", path: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "#/announcers", path: "/announcers", label: "Announcers", icon: "mic" },
  { href: "#/fans", path: "/fans", label: "Fans", icon: "fans" },
  { href: "#/about", path: "/about", label: "How it works", icon: "info" },
];

// Desktop collapse: an ancestor with data-collapsed="true" hides labels and centres icons.
const HIDE_COLLAPSED = "min-[901px]:[[data-collapsed=true]_&]:hidden";
const CENTER_COLLAPSED =
  "min-[901px]:[[data-collapsed=true]_&]:justify-center min-[901px]:[[data-collapsed=true]_&]:px-0";

const NAV_ITEM =
  "flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg aria-[current=page]:bg-surface-2 aria-[current=page]:text-fg aria-[current=page]:shadow-[inset_3px_0_0_var(--accent)] aria-[current=page]:[&_svg]:text-accent";

// Mobile: an off-canvas drawer, shown when an ancestor has data-open="true".
const ASIDE = cn(
  "sticky top-0 flex h-dvh flex-col gap-3 self-start overflow-x-hidden overflow-y-auto border-r border-line bg-surface px-3 py-4",
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
            "flex items-center gap-3 whitespace-nowrap p-1 font-heading text-[1.05rem] font-bold text-fg",
            "min-[901px]:[[data-collapsed=true]_&]:justify-center",
          )}
          href="#/"
          onClick={onNavigate}
          aria-label="Why It Happened, home"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 font-extrabold text-accent-ink"
            aria-hidden="true"
          >
            W
          </span>
          <span className={HIDE_COLLAPSED}>Why It Happened</span>
        </a>
        <button
          type="button"
          className="hidden size-10 place-items-center rounded-[10px] hover:bg-surface-2 max-[900px]:grid"
          onClick={onClose}
          aria-label="Close menu"
        >
          <Icon name="close" />
        </button>
      </div>

      <nav aria-label="Pages">
        <ul className="grid gap-1">
          {NAV.map((n) => {
            const active = n.path === path || (n.prefixes?.some((p) => path.startsWith(p)) ?? false);
            return (
              <li key={n.href}>
                <a
                  href={n.href}
                  className={cn(NAV_ITEM, CENTER_COLLAPSED)}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? n.label : undefined}
                  onClick={onNavigate}
                >
                  <Icon name={n.icon} />
                  <span className={HIDE_COLLAPSED}>{n.label}</span>
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
          <Icon name={theme === "dark" ? "sun" : "moon"} />
          <span className={HIDE_COLLAPSED}>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
        </button>
        <button
          type="button"
          className={cn(NAV_ITEM, CENTER_COLLAPSED, "max-[900px]:hidden")}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : undefined}
        >
          <span className={cn("transition-transform", collapsed && "rotate-180")}>
            <Icon name="chevrons" />
          </span>
          <span className={HIDE_COLLAPSED}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}