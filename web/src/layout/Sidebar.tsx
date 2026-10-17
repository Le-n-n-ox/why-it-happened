import { Icon, type IconName } from "@/components/icons";
import { Switch } from "@/components/Switch";
import type { Theme } from "@/hooks/useTheme";
const NAV: { href: string; path: string; label: string; icon: IconName; prefixes?: string[] }[] = [
  { href: "#/", path: "/", label: "Live", icon: "live", prefixes: ["/insight/"] },
  { href: "#/recap", path: "/recap", label: "Timeline", icon: "timeline" },
  { href: "#/analytics", path: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "#/players", path: "/players", label: "Players", icon: "players", prefixes: ["/player/"] },
  { href: "#/announcers", path: "/announcers", label: "Announcers", icon: "mic" },
  { href: "#/fans", path: "/fans", label: "Fans", icon: "fans" },
  { href: "#/about", path: "/about", label: "How it works", icon: "info" },
];

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
    <aside id="sidebar" className="sidebar" aria-label="Main navigation">
      <div className="sidebar__head">
        <a className="sidebar__brand" href="#/" onClick={onNavigate} aria-label="Why It Happened, home">
          <span className="sidebar__logo" aria-hidden="true">W</span>
          <span className="sidebar__brand-text">Why It Happened</span>
        </a>
        <button type="button" className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
          <Icon name="close" />
        </button>
      </div>

      <nav aria-label="Pages">
        <ul className="nav">
          {NAV.map((n) => {
            const active = n.path === path || (n.prefixes?.some((p) => path.startsWith(p)) ?? false);
            return (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="nav__link"
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? n.label : undefined}
                  onClick={onNavigate}
                >
                  <Icon name={n.icon} />
                  <span className="nav__label">{n.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__foot">
        <div className="theme-control">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
          <span className="nav__label">{theme === "dark" ? "Light theme" : "Dark theme"}</span>
          <Switch
            checked={theme === "light"}
            onChange={onToggleTheme}
            label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          />
        </div>
        <button type="button" className="nav__link nav__btn sidebar__collapse" onClick={onToggleCollapse}
          aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : undefined}>
          <Icon name="chevrons" />
          <span className="nav__label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}