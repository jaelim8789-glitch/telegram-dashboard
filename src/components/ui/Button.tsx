import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_STYLE: Record<Variant, string> = {
  primary: "bg-sky-500 text-white hover:bg-sky-400",
  secondary:
    "bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-750 hover:border-neutral-600",
  ghost: "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
};

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_STYLE[variant],
        className
      )}
      {...props}
    />
  );
}
