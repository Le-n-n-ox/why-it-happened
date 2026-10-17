// web/src/components/icons.tsx - small inline SVG icons (no icon library).
import type { ReactNode } from "react";

export type IconName =
  | "live" | "timeline" | "analytics" | "players" | "mic" | "fans" | "info"
  | "menu" | "close" | "sun" | "moon" | "chevrons" | "replay";

const PATHS: Record<IconName, ReactNode> = {
  live: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17" />
    </>
  ),
  timeline: (
    <>
      <path d="M3 12h18" />
      <circle cx="7" cy="12" r="2.2" />
      <circle cx="16" cy="12" r="2.2" />
      <path d="M7 5v3M16 16v3" />
    </>
  ),
  analytics: <path d="M3 20h18M6 20v-6M11 20V6M16 20v-9M20 20v-4" />,
  players: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.2a3.2 3.2 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  fans: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  chevrons: <path d="M11 7l-5 5 5 5M18 7l-5 5 5 5" />,
  replay: <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" />,
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="size-5 shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}