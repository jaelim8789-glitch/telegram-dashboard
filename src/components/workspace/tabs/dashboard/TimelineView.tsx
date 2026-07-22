"use client";

import { useEffect, useMemo } from "react";
import { Activity, CheckCircle2, XCircle, AlertTriangle, AlertCircle, UserPlus, ShieldOff, RefreshCw, Ban, PauseCircle, Bell } from "lucide-react";
import { useTimelineStore, type TimelineEvent } from "@/store/useTimelineStore";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

const ICON_MAP: Record<string, React.ElementType> = { CheckCircle2, XCircle, AlertTriangle, AlertCircle, UserPlus, ShieldOff, RefreshCw, Ban, PauseCircle, Bell, Activity };
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  success: { color: "text-app-success", bg: "bg-app-success-muted/20" }, danger: { color: "text-app-danger", bg: "bg-app-danger-muted/20" },
  warning: { color: "text-app-warning", bg: "bg-app-warning-muted/20" }, info: { color: "text-app-info", bg: "bg-app-info-muted/20" },
  neutral: { color: "text-app-text-subtle", bg: "bg-app-card-hover" },
};

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts + "Z").getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function SkeletonLine() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="flex flex-col items-center gap-1"><div className="h-3 w-3 rounded-full bg-app-card-hover" /><div className="flex-1 w-0.5 rounded-full bg-app-card-hover" /></div>
      <div className="flex-1 space-y-1 py-0.5"><div className="h-3 w-24 rounded bg-app-card-hover" /><div className="h-2 w-full rounded bg-app-card-hover" /></div>
    </div>
  );
}

interface TimelineViewProps { autonomous?: boolean; events?: TimelineEvent[]; loading?: boolean; limit?: number; }

export function TimelineView({ autonomous = true, events: propEvents, loading: propLoading, limit = 20 }: TimelineViewProps) {
  const storeEvents = useTimelineStore((s) => s.events);
  const storeLoading = useTimelineStore((s) => s.loading);
  const fetchEvents = useTimelineStore((s) => s.fetchEvents);

  const events = propEvents ?? storeEvents;
  const loading = propLoading ?? storeLoading;

  useEffect(() => { if (autonomous && events.length === 0 && !loading) fetchEvents(); }, [autonomous, events.length, loading, fetchEvents]);

  const displayed = useMemo(() => events.slice(0, limit), [events, limit]);

  if (loading && displayed.length === 0) {
    return (
      <Panel title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 타임라인</div>} className="w-full">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonLine key={i} />)}</div>
      </Panel>
    );
  }

  if (displayed.length === 0) {
    return (
      <Panel title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 타임라인</div>} className="w-full">
        <EmptyState icon={Activity} title="아직 이벤트가 없습니다" description="계정 활동이 기록되면 여기에 타임라인으로 표시됩니다." compact />
      </Panel>
    );
  }

  return (
    <Panel title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 타임라인</div>} description={`${displayed.length}개 이벤트`} className="w-full">
      <div className="relative">
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 rounded-full bg-app-border" />
        <div className="space-y-0">
          {displayed.map((event, idx) => {
            const Icon = ICON_MAP[event.icon] || Activity;
            const style = STATUS_STYLE[event.status] || STATUS_STYLE.neutral;
            const isLast = idx === displayed.length - 1;
            return (
              <div key={event.id} className="group relative flex gap-3 pb-3 last:pb-0">
                <div className="relative z-10 flex shrink-0 flex-col items-center">
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-app-bg transition-transform group-hover:scale-110", style.bg)}><Icon className={cn("h-3 w-3", style.color)} /></div>
                  {!isLast && <div className="mt-1 flex-1 w-0.5 rounded-full bg-app-border/50" style={{ minHeight: 8 }} />}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={cn("font-medium", style.color)}>{event.title}</span>
                    <span className="ml-auto text-[10px] text-app-text-subtle shrink-0">{formatRelativeTime(event.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-app-text-muted leading-relaxed line-clamp-2">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
