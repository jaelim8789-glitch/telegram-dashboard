"use client";

import { useRef, useEffect, memo } from "react";
import {
  Send, CheckCircle2, XCircle, AlertTriangle, UserPlus, Ban,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "sent" | "failed" | "warning" | "registered" | "banned" | "info";
  label: string;
  detail: string;
}

interface ActivityTimelineProps {
  events?: TimelineEvent[];
  className?: string;
  maxHeight?: number;
}

// ─── Event Meta ───────────────────────────────────────────────────

const EVENT_META: Record<TimelineEvent["type"], {
  icon: typeof Send; dot: string; bg: string; gradient: string;
}> = {
  sent: { icon: CheckCircle2, dot: "bg-accent", bg: "bg-accent/10", gradient: "from-accent/20 to-transparent" },
  failed: { icon: XCircle, dot: "bg-app-danger", bg: "bg-app-danger/10", gradient: "from-app-danger/20 to-transparent" },
  warning: { icon: AlertTriangle, dot: "bg-app-warning", bg: "bg-app-warning/10", gradient: "from-app-warning/20 to-transparent" },
  registered: { icon: UserPlus, dot: "bg-cyan", bg: "bg-[rgba(0,212,255,0.1)]", gradient: "from-[rgba(0,212,255,0.2)] to-transparent" },
  banned: { icon: Ban, dot: "bg-app-danger", bg: "bg-app-danger/10", gradient: "from-app-danger/20 to-transparent" },
  info: { icon: Send, dot: "bg-app-text-subtle", bg: "bg-app-card-hover", gradient: "from-app-text-subtle/10 to-transparent" },
};

// ─── Time Format ──────────────────────────────────────────────────

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return ${mins}m ago;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return ${hours}h ago;
  const days = Math.floor(hours / 24);
  if (days < 7) return ${days}d ago;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── DEFAULT EVENTS ───────────────────────────────────────────────

const DEFAULT_EVENTS: TimelineEvent[] = [
  { id: "e1", timestamp: new Date(Date.now() - 2 * 60000).toISOString(), type: "sent", label: "Broadcast sent", detail: "Marketing campaign → 1,247 recipients" },
  { id: "e2", timestamp: new Date(Date.now() - 15 * 60000).toISOString(), type: "registered", label: "Account registered", detail: "Account #4 connected successfully" },
  { id: "e3", timestamp: new Date(Date.now() - 42 * 60000).toISOString(), type: "warning", label: "Rate limit reached", detail: "Account #2 — waiting 5 min cooldown" },
  { id: "e4", timestamp: new Date(Date.now() - 90 * 60000).toISOString(), type: "failed", label: "Delivery failed", detail: "Message blocked — recipient not found" },
  { id: "e5", timestamp: new Date(Date.now() - 150 * 60000).toISOString(), type: "info", label: "System health check", detail: "All services operational" },
  { id: "e6", timestamp: new Date(Date.now() - 240 * 60000).toISOString(), type: "banned", label: "Account banned", detail: "Account #7 flagged by Telegram" },
  { id: "e7", timestamp: new Date(Date.now() - 360 * 60000).toISOString(), type: "sent", label: "Recurring delivery", detail: "Daily digest sent to 892 users" },
];

// ─── Component ───────────────────────────────────────────────────

export const ActivityTimeline = memo(function ActivityTimeline({
  events = DEFAULT_EVENTS,
  className,
  maxHeight = 400,
}: ActivityTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const handler = () => { ticking = true; };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-accent-border/30",
        "bg-glass-bg backdrop-blur-xl",
        "transition-all duration-300",
        "hover:border-accent-border/50 hover:shadow-[0_0_25px_-8px_rgba(139,92,246,0.2)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-accent-border/20 px-4 py-3">
        <div className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span className="text-xs font-semibold text-app-text">Activity Timeline</span>
        <span className="ml-auto text-[10px] text-app-text-subtle tabular-nums">
          {events.length} events
        </span>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="overflow-y-auto overscroll-contain" style={{ maxHeight }}>
        <div className="relative px-4 py-3">
          {/* Vertical timeline line */}
          <div className="absolute left-[26px] top-4 bottom-4 w-px bg-gradient-to-b from-accent/40 via-accent/20 to-transparent" />

          <div className="space-y-0">
            {events.map((event, idx) => {
              const meta = EVENT_META[event.type];
              const Icon = meta.icon;
              const isLast = idx === events.length - 1;
              return (
                <div key={event.id} className="group relative flex gap-3 pb-4 last:pb-0">
                  {/* Dot */}
                  <div className="relative z-10 flex shrink-0 flex-col items-center">
                    <div className={cn(
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full",
                      "ring-[3px] ring-bg transition-all duration-300",
                      meta.bg, "group-hover:scale-125 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.4)]",
                    )}>
                      <Icon className="h-2.5 w-2.5 text-app-text" />
                    </div>
                    {!isLast && (
                      <div className="mt-1 w-px flex-1 bg-gradient-to-b from-accent-border/30 to-transparent" style={{ minHeight: 8 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-medium",
                        event.type === "sent" && "text-accent",
                        event.type === "failed" && "text-app-danger",
                        event.type === "warning" && "text-app-warning",
                        event.type === "registered" && "text-cyan",
                        event.type === "banned" && "text-app-danger",
                        event.type === "info" && "text-app-text-muted",
                      )}>
                        {event.label}
                      </span>
                      <span className="ml-auto text-[10px] text-app-text-subtle shrink-0 tabular-nums">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-app-text-muted leading-relaxed line-clamp-2">
                      {event.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
});

export type { TimelineEvent, ActivityTimelineProps };
