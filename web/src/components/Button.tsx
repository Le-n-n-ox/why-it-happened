// web/src/components/Button.tsx - the one button style. aria-pressed="true" shows the pressed look.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

type Variant = "default" | "ghost" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface-2 px-3.5 py-[7px] transition hover:bg-surface-3 active:translate-y-px " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "motion-reduce:active:translate-y-0 " +
  "disabled:cursor-default disabled:opacity-50 " +
  "aria-pressed:border-accent aria-pressed:text-accent aria-pressed:bg-accent/10";

const VARIANTS: Record<Variant, string> = {
  default: "",
  ghost: "border-transparent bg-transparent hover:bg-surface-2",
  icon: "size-10 p-0",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "default", className, type = "button", ...rest }: Props) {
  return <button type={type} className={cn(BASE, VARIANTS[variant], className)} {...rest} />;
}