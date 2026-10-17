// web/src/App.tsx - shell: sidebar, topbar, banners and the current page.
import { useCallback, useEffect, useRef, useState } from "react";
import { MatchProvider } from "@/app/MatchProvider";
import { RoutePage } from "@/app/routes";
import { useMatch } from "@/types/matchContext";
import { Header } from "@/layout/Header";
import { Sidebar } from "@/layout/Sidebar";
import { useHashRoute } from "@/hooks/useHashRoute";
import { useTheme } from "@/hooks/useTheme";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem("nav") === "collapsed";
  } catch {
    return false; // storage can be blocked
  }
}

function Shell() {
  const path = useHashRoute();
  const { theme, toggle: toggleTheme } = useTheme();
  const { status, restart, eventsFailed } = useMatch();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem("nav", collapsed ? "collapsed" : "open");
    } catch {
      /* storage blocked: ignore */
    }
  }, [collapsed]);

  // Mobile drawer: move focus in when it opens, close on Escape.
  useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLElement>("#sidebar a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <div className="shell" data-open={open} data-collapsed={collapsed}>
      <Sidebar
        path={path}
        collapsed={collapsed}
        theme={theme}
        onNavigate={closeMenu}
        onClose={closeMenu}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onToggleTheme={toggleTheme}
      />
      <button type="button" className="backdrop" tabIndex={-1} aria-label="Close menu" onClick={closeMenu} />

      <div className="shell__main">
        <Header menuButton={menuButton} open={open} onOpenMenu={() => setOpen(true)} />

        <main className="content">
          {status === "error" && (
            <p role="alert" className="banner">
              Can't reach the match feed. Is the backend running?{" "}
              <button type="button" onClick={restart}>Retry</button>
            </p>
          )}
          {eventsFailed && status !== "error" && (
            <p role="alert" className="banner">
              Couldn't load match events, so the pitch is unavailable.{" "}
              <button type="button" onClick={() => window.location.reload()}>Reload</button>
            </p>
          )}
          <div key={path} className="page-enter">
            <RoutePage path={path} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MatchProvider>
      <Shell />
    </MatchProvider>
  );
}