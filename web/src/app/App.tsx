// web/src/app/App.tsx - shell: sidebar, header, banners and the current page.
import { useCallback, useEffect, useRef, useState } from "react";
import { MatchProvider } from "@/app/MatchProvider";
import { RoutePage } from "@/app/routes";
import { Button } from "@/components/Button";
import { useHashRoute } from "@/hooks/useHashRoute";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "@/layout/Header";
import { Sidebar } from "@/layout/Sidebar";
import { useMatch } from "@/types/matchContext";

const BANNER = "m-0 rounded-card bg-warn px-3.5 py-2.5 text-black";
const BANNER_BUTTON = "border-black bg-white text-black hover:bg-white/90";

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
    <div
      className="grid min-h-screen grid-cols-[var(--nav-w)_minmax(0,1fr)] transition-[grid-template-columns] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] [--nav-w:248px] data-[collapsed=true]:[--nav-w:76px] max-[900px]:grid-cols-[minmax(0,1fr)]"
      data-open={open}
      data-collapsed={collapsed}
    >
      <Sidebar
        path={path}
        collapsed={collapsed}
        theme={theme}
        onNavigate={closeMenu}
        onClose={closeMenu}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onToggleTheme={toggleTheme}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={closeMenu}
        className="pointer-events-none fixed inset-0 z-30 hidden rounded-none border-0 bg-black/55 p-0 opacity-0 transition-opacity duration-[250ms] max-[900px]:block max-[900px]:backdrop-blur-[2px] max-[900px]:[[data-open=true]_&]:pointer-events-auto max-[900px]:[[data-open=true]_&]:opacity-100"
      />

      <div className="min-w-0">
        <Header
          menuButton={menuButton}
          open={open}
          onOpenMenu={() => setOpen(true)}
        />

        <main className="mx-auto grid w-full max-w-[1280px] gap-4 p-4">
          {status === "error" && (
            <p role="alert" className={BANNER}>
              Can't reach the match feed. Is the backend running?{" "}
              <Button className={BANNER_BUTTON} onClick={restart}>
                Retry
              </Button>
            </p>
          )}
          {eventsFailed && status !== "error" && (
            <p role="alert" className={BANNER}>
              Couldn't load match events, so the pitch is unavailable.{" "}
              <Button
                className={BANNER_BUTTON}
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            </p>
          )}
          <div key={path} className="animate-page-in">
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
