import { memo, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "touch"; // 터치 최적화 사이즈 추가

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Defaults to "md", which matches the original (pre-`size`-prop) button
   * exactly — existing call sites render unchanged. */
  size?: Size;
  /** Shows a spinner and sets aria-busy; implies disabled. Button stays the
   * same width/height so surrounding layout doesn't jump. */
  loading?: boolean;
}

const VARIANT_STYLE: Record<Variant, string> = {
  primary: "bg-app-primary text-white shadow-sm shadow-app-primary/20 hover:bg-app-primary-hover",
  secondary:
    "bg-app-card text-app-text border border-app-border hover:border-app-border-strong hover:bg-app-card-hover",
  ghost: "text-app-text-muted hover:bg-app-card hover:text-app-text",
  danger: "bg-app-danger-muted text-app-danger border border-app-danger/20 hover:bg-app-danger/20",
};

const SIZE_STYLE: Record<Size, string> = {
  sm: "rounded-lg px-2.5 py-1 text-xs",
  md: "rounded-xl px-3 py-1.5 text-sm",
  lg: "rounded-xl px-4 py-2.5 text-sm",
  touch: "rounded-xl px-4 py-3 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center", // 터치 최적화 사이즈 추가
};

export const Button = memo(function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1.5 font-medium",
        "transition-all duration-150 ease-out",
        "active:scale-[0.97] active:duration-75",
        "hover:-translate-y-[0.5px]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:active:scale-100",
        "select-none",
        SIZE_STYLE[size],
        VARIANT_STYLE[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});