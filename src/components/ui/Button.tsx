import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_STYLE: Record<Variant, string> = {
  primary: "bg-app-primary text-white shadow-sm shadow-app-primary/20 hover:bg-app-primary-hover",
  secondary:
    "bg-app-card text-app-text border border-app-border hover:border-app-border-strong hover:bg-app-card-hover",
  ghost: "text-app-text-muted hover:bg-app-card hover:text-app-text",
  danger: "bg-app-danger-muted text-app-danger border border-app-danger/20 hover:bg-app-danger/20",
};

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium",
        "transition-all duration-150 ease-out active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        VARIANT_STYLE[variant],
        className
      )}
      {...props}
    />
  );
}
