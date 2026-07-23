import { memo, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  tone?: Tone;
  className?: string;
  children?: ReactNode;
}

const TONE_STYLE: Record<Tone, string> = {
  neutral: "bg-app-card-hover text-app-text-muted border-app-border-strong",
  success: "bg-app-success-muted text-app-success border-app-success/20",
  warning: "bg-app-warning-muted text-app-warning border-app-warning/20",
  danger: "bg-app-danger-muted text-app-danger border-app-danger/20",
  info: "bg-app-info-muted text-app-info border-app-info/20",
};

export const Badge = memo(function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-4",
        TONE_STYLE[tone],
        className
      )}
    >
      {children}
    </span>
  );
});
