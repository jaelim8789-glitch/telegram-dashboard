import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_STYLE: Record<Tone, string> = {
  neutral: "bg-app-card-hover text-app-text-muted border-app-border-strong",
  success: "bg-app-success-muted text-app-success border-app-success/20",
  warning: "bg-app-warning-muted text-app-warning border-app-warning/20",
  danger: "bg-app-danger-muted text-app-danger border-app-danger/20",
  info: "bg-app-primary-muted text-app-primary-hover border-app-primary/20",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE_STYLE[tone]
      )}
    >
      {children}
    </span>
  );
}
