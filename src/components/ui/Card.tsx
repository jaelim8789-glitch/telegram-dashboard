import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  selected?: boolean;
  interactive?: boolean;
}

/** A generic surface for grid items (e.g. selectable group cards). Renders as a
 * <button> when `interactive` (default), or a plain <div> for static content. */
export function Card({ children, selected, interactive = true, className, ...props }: CardProps) {
  const base = cn(
    "rounded-2xl border p-3 text-left transition-all duration-150",
    selected
      ? "border-app-primary/50 bg-app-primary-muted"
      : "border-app-border bg-app-card hover:border-app-border-strong hover:bg-app-card-hover",
    className
  );

  if (!interactive) {
    return <div className={base}>{children}</div>;
  }

  return (
    <button type="button" className={cn(base, "active:scale-[0.99]")} {...props}>
      {children}
    </button>
  );
}
