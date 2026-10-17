// web/src/Actions.tsx - small buttons that give feedback for a moment, then reset.
import { useEffect, useState } from "react";
import { copyText, shareText, type ShareResult } from "@/lib/share";

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
  return (
    <button type="button" onClick={onClick}>
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}

export function ShareButton({ text, url }: { text: string; url: string }) {
  const [state, setState] = useReset<"idle" | ShareResult>("idle");
  const onClick = async () => setState(await shareText(text, url));
  const label =
    state === "copied" ? "Link copied"
    : state === "shared" ? "Shared"
    : state === "failed" ? "Share failed"
    : "Share";
  return (
    <button type="button" onClick={onClick}>{label}</button>
  );
}