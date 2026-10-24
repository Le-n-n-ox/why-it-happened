// web/src/components/Actions.tsx - buttons that give feedback for a moment, then reset.
import { useEffect, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { copyText, shareText, type ShareResult } from "../lib/share";
import { Button } from "./Button";

function useReset<T extends string>(idle: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(idle);
  useEffect(() => {
    if (value === idle) return;
    const t = window.setTimeout(() => setValue(idle), 1800);
    return () => window.clearTimeout(t);
  }, [value, idle]);
  return [value, setValue];
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useReset<"idle" | "done" | "failed">("idle");
  const onClick = async () => setState((await copyText(text)) ? "done" : "failed");

  const Icon = state === "done" ? Check : state === "failed" ? X : Copy;
  const visibleLabel = state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <Button
      onClick={onClick}
      aria-live="polite"
      aria-label={state === "done" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : label}
    >
      <Icon size={14} aria-hidden="true" className="mr-1.5" />
      {visibleLabel}
    </Button>
  );
}

export function ShareButton({ text, url }: { text: string; url: string }) {
  const [state, setState] = useReset<"idle" | ShareResult>("idle");
  const onClick = async () => setState(await shareText(text, url));

  const Icon = state === "copied" || state === "shared" ? Check : state === "failed" ? X : Share2;
  const visibleLabel =
    state === "copied" ? "Link copied"
    : state === "shared" ? "Shared"
    : state === "failed" ? "Share failed"
    : "Share";

  return (
    <Button
      onClick={onClick}
      aria-live="polite"
      aria-label={
        state === "copied" ? "Link copied to clipboard"
        : state === "shared" ? "Shared"
        : state === "failed" ? "Share failed"
        : "Share"
      }
    >
      <Icon size={14} aria-hidden="true" className="mr-1.5" />
      {visibleLabel}
    </Button>
  );
}