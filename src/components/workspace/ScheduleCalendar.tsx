"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Broadcast } from "@/types";

interface ScheduleCalendarProps {
  broadcasts: Broadcast[];
  onCancel?: (broadcast: Broadcast) => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Pad with previous month's days
  const startPad = first.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }
  // Current month
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Pad with next month's days
  const endPad = 6 - last.getDay();
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

export function ScheduleCalendar({ broadcasts, onCancel }: ScheduleCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const scheduledCount = useMemo(() => {
    return broadcasts.filter((b) => b.scheduledAt).length;
  }, [broadcasts]);

  // Auto-collapse when there are no scheduled broadcasts
  if (scheduledCount === 0) {
    return (
      <div className="space-y-2">
        <button onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-between rounded-lg border border-app-border bg-app-card/50 px-3 py-2 text-xs text-app-text-muted hover:text-app-text transition-colors">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-app-text-subtle" />
            예약된 발송 없음
          </span>
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-90"}`} />
        </button>
        {!collapsed && (
          <p className="text-[11px] text-app-text-muted text-center py-2 italic">달력을 표시하려면 발송을 예약하세요.</p>
        )}
      </div>
    );
  }

  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Group scheduled broadcasts by date
  const scheduledByDate = useMemo(() => {
    const map = new Map<string, Broadcast[]>();
    for (const b of broadcasts) {
      if (b.scheduledAt) {
        const dateKey = b.scheduledAt.slice(0, 10);
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(b);
      }
    }
    return map;
  }, [broadcasts]);

  const selectedBroadcasts = selectedDate ? scheduledByDate.get(selectedDate) ?? [] : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-app-text">
          <CalendarDays className="h-3.5 w-3.5 text-app-primary" />
          {viewYear}년 {viewMonth + 1}월
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="flex h-6 w-6 items-center justify-center rounded text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" aria-label="이전 달">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
            className="rounded px-1.5 py-0.5 text-[10px] text-app-text-muted hover:text-app-text transition-colors">
            오늘
          </button>
          <button onClick={nextMonth} className="flex h-6 w-6 items-center justify-center rounded text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" aria-label="다음 달">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-app-border bg-app-border">
        {DAY_LABELS.map((label) => (
          <div key={label} className="bg-app-card px-1 py-1 text-center text-[9px] font-medium text-app-text-muted">
            {label}
          </div>
        ))}
        {weeks.flat().map((date, i) => {
          const dateKey = date.toISOString().slice(0, 10);
          const isCurrentMonth = date.getMonth() === viewMonth;
          const isToday = dateKey === today.toISOString().slice(0, 10);
          const isSelected = dateKey === selectedDate;
          const dayEvents = scheduledByDate.get(dateKey);
          const hasEvents = !!dayEvents?.length;
          const hasFailed = dayEvents?.some((b) => b.status === "failed");

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : dateKey)}
              className={cn(
                "relative flex flex-col items-center px-0.5 py-1 text-xs transition-colors min-h-[40px]",
                isCurrentMonth ? "bg-app-card" : "bg-app-bg/50",
                isSelected && "ring-1 ring-inset ring-app-primary",
                isToday && "bg-app-primary/5",
                "hover:bg-app-card-hover"
              )}
            >
              <span className={cn(
                "text-[10px] leading-tight",
                isToday ? "font-bold text-app-primary" : isCurrentMonth ? "text-app-text" : "text-app-text-muted/40"
              )}>
                {date.getDate()}
              </span>
              {hasEvents && (
                <div className="mt-0.5 flex gap-0.5">
                  {hasFailed ? (
                    <span className="inline-block h-1 w-1 rounded-full bg-app-danger" />
                  ) : (
                    <span className="inline-block h-1 w-1 rounded-full bg-app-primary" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div className="rounded-xl border border-app-border bg-app-card/50 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-app-text">{selectedDate}</span>
            <span className="text-[10px] text-app-text-muted">{selectedBroadcasts.length}개 예약</span>
          </div>
          {selectedBroadcasts.length === 0 ? (
            <p className="text-[10px] text-app-text-muted py-2 text-center italic">예약된 발송이 없습니다</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
              {selectedBroadcasts.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-[10px]">
                  <Clock className="h-3 w-3 shrink-0 text-app-text-muted" />
                  <span className="truncate flex-1 text-app-text">{b.message}</span>
                  <span className="shrink-0 text-app-text-muted">
                    {b.scheduledAt ? b.scheduledAt.slice(11, 16) : ""}
                  </span>
                  {b.status === "failed" && <AlertTriangle className="h-3 w-3 shrink-0 text-app-danger" />}
                  {onCancel && b.status === "pending" && (
                    <button onClick={() => onCancel(b)}
                      className="shrink-0 rounded px-1 py-0.5 text-app-danger hover:bg-app-danger-muted transition-colors">
                      취소
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
