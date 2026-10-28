// web/src/app/App.tsx - shell: sidebar, header, banners and the current page.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import { MatchProvider } from "@/app/MatchProvider";
import { RoutePage } from "@/app/routes";
import { Button } from "@/components/Button";
import { useHashRoute } from "@/hooks/useHashRoute";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "@/layout/Header";
import { Sidebar } from "@/layout/Sidebar";
import { pageTitle } from "@/lib/titles";
import { useMatch } from "@/types/matchContext";
import { LandingPage } from "@/pages/landing/LandingPage";

const ALERT = "flex items-start gap-3 rounded-card border px-4 py-3";
const ALERT_TEXT = "m-0 flex-1 text-sm font-medium leading-snug text-fg";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem("nav") === "collapsed";
  } catch {
    return false;
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
    try { localStorage.setItem("nav", collapsed ? "collapsed" : "open"); } catch {}
  }, [collapsed]);

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

  useEffect(() => {
    document.title = pageTitle(path);
  }, [path]);

  return (
    <div
      className="grid min-h-screen grid-cols-[var(--nav-w)_minmax(0,1fr)] transition-[grid-template-columns] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] [--nav-w:248px] data-[collapsed=true]:[--nav-w:76px] max-[900px]:grid-cols-[minmax(0,1fr)]"
      data-open={open}
      data-collapsed={collapsed}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink focus:shadow-card focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
      >
        Skip to main content
      </a>

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
        <Header menuButton={menuButton} open={open} onOpenMenu={() => setOpen(true)} />
        
        <main id="main-content" tabIndex={-1} className="mx-auto grid w-full max-w-[1280px] gap-4 p-4 outline-none">
          {status === "error" && (
            <div role="alert" className={`${ALERT} border-live/40 bg-live/10`}>
              <WifiOff size={18} className="mt-0.5 shrink-0 text-live" aria-hidden="true" />
              <p className={ALERT_TEXT}>Can't reach the match feed. Is the backend running?</p>
              <Button className="shrink-0 border-0 bg-live text-white hover:brightness-110" onClick={restart}>Retry</Button>
            </div>
          )}

          {eventsFailed && status !== "error" && (
            <div role="alert" className={`${ALERT} border-warn/40 bg-warn/10`}>
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
              <p className={ALERT_TEXT}>Couldn't load match events, so the pitch is unavailable.</p>
              {/* FIX APPLIED HERE: Changed text-black to text-warn-ink */}
              <Button className="shrink-0 border-0 bg-warn text-warn-ink hover:brightness-95" onClick={() => window.location.reload()}>Reload</Button>
            </div>
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
  const path = useHashRoute();

  const isLanding = path === "" || path === "/" || path === "/welcome";

  useEffect(() => {
    if (isLanding) {
      document.title = "Why It Happened";
      
      // Clean up the URL if they used #/ or #/welcome, leaving just http://localhost:8001/
      if (window.location.hash !== "") {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [isLanding]);

  if (isLanding) {
    return <LandingPage />;
  }

  return (
    <MatchProvider>
      <Shell />
    </MatchProvider>
  );
}