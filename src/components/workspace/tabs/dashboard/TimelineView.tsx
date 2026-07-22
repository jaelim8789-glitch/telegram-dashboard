"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Send,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Info,
  Loader2,
  RefreshCw,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTimelineStore, type TimelineEvent } from "@/store/useTimelineStore";
import { formatRelativeTime } from "@/lib/formatTime";
import { Skeleton } from "@/components/ui/Skeleton";

const EVENT_ICONS: Record<TimelineEvent["type"], React.ReactNode> = {
  broadcast: <Send className="h-4 w-4" />,
  health: <Activity className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
  account: <UserPlus className="h-4 w-4" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "border-l-blue-500 bg-blue-500/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  error: "border-l-rose-500 bg-rose-500/5",
};

interface TimelineViewProps {
  className?: string;
}

export function TimelineView({ className }: TimelineViewProps) {
  const { events, loading, fetchEvents } = useTimelineStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className={cn("rounded-xl border border-app-border/60 bg-app-card", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border/40">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-app-primary" />
          <span className="text-sm font-semibold">타임라인</span>
        </div>
        <button
          type="button"
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          새로고침
        </button>
      </div>

      <div className="divide-y divide-app-border/30">
        {loading && events.length === 0 ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-app-text-muted">
            <Info className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">이벤트가 없습니다</p>
          </div>
        ) : (
          events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={cn(
                "flex items-start gap-3 border-l-2 px-4 py-3",
                SEVERITY_COLORS[event.severity ?? "info"]
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  event.severity === "error" ? "bg-rose-500/10 text-rose-500" :
                  event.severity === "warning" ? "bg-amber-500/10 text-amber-500" :
                  "bg-blue-500/10 text-blue-500"
                )}
              >
                {EVENT_ICONS[event.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-app-text truncate">{event.title}</span>
                  <span className="shrink-0 text-[10px] text-app-text-muted">{formatRelativeTime(event.timestamp)}</span>
                </div>
                <p className="text-xs text-app-text-muted mt-0.5 line-clamp-2">{event.description}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
