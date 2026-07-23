import { memo, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  tone?: Tone;
  className?: string;
  children?: ReactNode;
}

const TONE_STYLE: Record<Tone, string> = {
  neutral:
    "bg-[rgba(139,92,246,0.08)] text-[#8B5CF6] border-[rgba(139,92,246,0.20)] " +
    "shadow-[0_0_8px_rgba(139,92,246,0.06)]",
  success:
    "bg-[rgba(34,197,94,0.10)] text-[#22c55e] border-[rgba(34,197,94,0.20)] " +
    "shadow-[0_0_8px_rgba(34,197,94,0.06)]",
  warning:
    "bg-[rgba(245,158,11,0.10)] text-[#f59e0b] border-[rgba(245,158,11,0.20)] " +
    "shadow-[0_0_8px_rgba(245,158,11,0.06)]",
  danger:
    "bg-[rgba(239,68,68,0.10)] text-[#ef4444] border-[rgba(239,68,68,0.20)] " +
    "shadow-[0_0_8px_rgba(239,68,68,0.06)]",
  info:
    "bg-[rgba(0,212,255,0.10)] text-[#00D4FF] border-[rgba(0,212,255,0.20)] " +
    "shadow-[0_0_8px_rgba(0,212,255,0.06)]",
};

export const Badge = memo(function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-4",
        "backdrop-blur-md saturate-[1.2] transition-all duration-200",
        TONE_STYLE[tone],
        className
      )}
    >
      {children}
    </span>
  );
});
