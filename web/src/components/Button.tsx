// web/src/components/Button.tsx - the one button style. aria-pressed="true" shows the pressed look.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "ghost" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3.5 py-[7px] text-sm font-medium shadow-soft transition hover:bg-surface-3 active:translate-y-px " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "motion-reduce:active:translate-y-0 " +
  "disabled:cursor-default disabled:opacity-50 " +
  "aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-accent " +
  "max-[900px]:min-h-11"; // phone tap targets of at least 44px

const VARIANTS: Record<Variant, string> = {
  default: "",
  primary: "border-accent bg-accent text-accent-ink hover:bg-accent/90",
  ghost: "border-transparent bg-transparent shadow-none hover:bg-surface-2",
  icon: "size-10 p-0 max-[900px]:size-11",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "default", className, type = "button", ...rest }: Props) {
  return <button type={type} className={cn(BASE, VARIANTS[variant], className)} {...rest} />;
}