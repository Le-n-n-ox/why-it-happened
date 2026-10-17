import type { RefObject } from "react";

interface HeaderProps {
  menuButton: RefObject<HTMLButtonElement>;
  open: boolean;
  onOpenMenu: () => void;
}

export default function Header({ menuButton, open, onOpenMenu }: HeaderProps) {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-4">
        {/* Mobile menu button (Hidden on desktop screens >= 900px) */}
        <button
          ref={menuButton}
          type="button"
          onClick={onOpenMenu}
          aria-expanded={open}
          aria-label="Open menu"
          className="block min-[900px]:hidden rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Why It Happened
        </h1>
      </div>
      
      {/* Right side actions (power switch, etc) can go here */}
      <div className="flex items-center gap-4">
      </div>
    </header>
  );
}