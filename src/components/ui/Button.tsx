import { memo, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_STYLE: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white " +
    "shadow-[0_0_20px_rgba(139,92,246,0.25)] " +
    "hover:shadow-[0_0_28px_rgba(139,92,246,0.40)] " +
    "hover:from-[#9D6FF7] hover:to-[#7C3AED] " +
    "border border-[rgba(139,92,246,0.30)]",
  secondary:
    "bg-[rgba(10,10,15,0.88)] text-[#e5e5ec] " +
    "border border-[rgba(139,92,246,0.15)] " +
    "backdrop-blur-xl saturate-[1.2] " +
    "shadow-[0_2px_12px_rgba(0,0,0,0.04)] " +
    "hover:border-[rgba(139,92,246,0.40)] " +
    "hover:bg-[rgba(139,92,246,0.06)] " +
    "hover:shadow-[0_4px_20px_rgba(139,92,246,0.08)]",
  ghost:
    "text-[#686880] bg-transparent " +
    "hover:bg-[rgba(139,92,246,0.08)] hover:text-[#e5e5ec]",
  danger:
    "bg-[rgba(239,68,68,0.10)] text-[#ef4444] " +
    "border border-[rgba(239,68,68,0.20)] " +
    "hover:bg-[rgba(239,68,68,0.18)] " +
    "hover:border-[rgba(239,68,68,0.35)] " +
    "backdrop-blur-xl saturate-[1.2]",
};

const SIZE_STYLE: Record<Size, string> = {
  sm: "rounded-lg px-2.5 py-1 text-xs",
  md: "rounded-xl px-3 py-1.5 text-sm",
  lg: "rounded-xl px-4 py-2.5 text-sm",
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
        "transition-all duration-200 ease-out",
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
