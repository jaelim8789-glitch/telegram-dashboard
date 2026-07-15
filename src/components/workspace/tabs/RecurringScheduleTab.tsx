"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Clock,
  Copy,
  PauseCircle,
  Pause,
  PlayCircle,
  Play,
  Plus,
  RefreshCw,
  SendHorizonal,
  X,
  XCircle,
} from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { Account, Broadcast, BroadcastChild } from "@/types";
import { getRecurringState, RECURRING_INTERVALS } from "@/types";
import { FailureRecoveryPanel } from "@/components/workspace/tabs/log/FailureRecoveryPanel";

type RState = ReturnType<typeof getRecurringState>;
type RFilter = RState | "all";

const STATE_META: Record<RState, { tone: "success" | "warning" | "danger" | "info" | "neutral"; label: string; icon: ReactNode }> = {
  active: { tone: "success", label: "활성", icon: <PlayCircle className="h-3.5 w-3.5" /> },
  paused: { tone: "warning", label: "일시중지", icon: <PauseCircle className="h-3.5 w-3.5" /> },
  cancelled: { tone: "neutral", label: "취소", icon: <Ban className="h-3.5 w-3.5" /> },
  error: { tone: "danger", label: "오류", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const CHILD_META: Record<string, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소" },
};

function accountLabel(accounts: Account[], accountId: string): string {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) return accountId.slice(0, 8);
  const name = account.name?.trim();
  return name && name.length > 0 ? name : account.phone;
}

function fmtRel(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(`${iso}Z`).getTime()) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function fmtDT(iso: string | null): string {
  if (!iso) return "-";
  return new Date(`${iso}Z`).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function CountPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-xs",
        tone === "neutral" && "border-app-border bg-app-card",
        tone === "success" && "border-app-success/20 bg-app-success-muted/10",
        tone === "warning" && "border-app-warning/20 bg-app-warning-muted/10",
        tone === "danger" && "border-app-danger/20 bg-app-danger-muted/10",
        tone === "info" && "border-app-info/20 bg-app-info-muted/10",
      )}
    >
      <div className="text-[11px] text-app-text-muted">{label}</div>
      <div className={cn("mt-0.5 font-bold tabular-nums tracking-tight", tone === "danger" ? "text-app-danger" : "text-app-text")}>
        {value}
      </div>
    </div>
  );
}

function HistoryItem({
  child,
  expanded,
  onToggle,
}: {
  child: BroadcastChild;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = CHILD_META[child.status] ?? CHILD_META.pending;
  const isFailed = child.status === "failed";
  const canExpand = isFailed && (child.failureInfo != null || Boolean(child.errorMessage));

  return (
    <div className="overflow-hidden rounded-2xl border border-app-border bg-app-bg">
      <button
        type="button"
        disabled={!canExpand}
        aria-expanded={canExpand ? expanded : undefined}
        onClick={canExpand ? onToggle : undefined}
        className={cn(
          "w-full rounded-2xl border px-3.5 py-3 text-left transition-colors touch-manipulation",
          isFailed && "border-app-danger/20 bg-app-danger-muted/10",
          child.status === "sent" && "border-app-success/20 bg-app-success-muted/10",
          child.status === "sending" && "border-app-info/20 bg-app-info-muted/10",
          child.status === "cancelled" && "border-app-warning/20 bg-app-warning-muted/10",
          !isFailed && child.status !== "sending" && child.status !== "sent" && child.status !== "cancelled" && "border-app-border bg-app-card",
          canExpand && "hover:border-app-border-strong",
          !canExpand && "cursor-default",
        )}
      >
        <div className="flex items-start gap-3">
          <Badge tone={meta.tone} className="shrink-0">
            {meta.label}
          </Badge>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-app-text">
                {child.message}
              </p>
              <span className="shrink-0 text-[11px] text-app-text-subtle">{fmtDT(child.createdAt)}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-app-text-muted">
              <span className="rounded-full bg-app-card-hover px-2 py-1 font-mono">{child.status}</span>
              {child.errorMessage && (
                <span className="rounded-full bg-app-danger-muted/20 px-2 py-1 font-medium text-app-danger">
                  오류 있음
                </span>
              )}
              {canExpand && (
                <span className="rounded-full bg-app-card-hover px-2 py-1 font-medium text-app-text-muted">
                  {expanded ? "접기" : "세부 보기"}
                </span>
              )}
            </div>
          </div>
          {canExpand && <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-app-text-subtle transition-transform", expanded && "rotate-180")} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3.5 pb-3"
          >
            {child.failureInfo ? (
              <FailureRecoveryPanel
                failureInfo={child.failureInfo}
                errorMessage={child.errorMessage}
                accountDead={false}
                actions="readonly"
                onRetry={() => {}}
                onEditResend={() => {}}
              />
            ) : (
              <div className="rounded-xl border border-app-danger/20 bg-app-danger-muted/10 p-3">
                <p className="text-[11px] font-semibold text-app-danger">오류 상세</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-app-text-muted">
                  {child.errorMessage ?? "오류 메시지가 제공되지 않았습니다."}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Monthly heatmap calendar showing execution status by day */
function ExecutionHeatmap({ children }: { children: BroadcastChild[] }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const monthLabel = new Date(currentYear, currentMonth).toLocaleString("ko-KR", { month: "long", year: "numeric" });

  // Build a map of date → { total, success, failed }
  const dayData = useMemo(() => {
    const map: Record<string, { total: number; success: number; failed: number }> = {};
    for (const child of children) {
      const d = new Date(`${child.createdAt}Z`);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = { total: 0, success: 0, failed: 0 };
      map[key].total++;
      if (child.status === "sent") map[key].success++;
      else if (child.status === "failed") map[key].failed++;
    }
    return map;
  }, [children]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  function getCellColor(dateKey: string): string {
    const data = dayData[dateKey];
    if (!data) return "bg-app-card-hover/30";
    if (data.failed > 0 && data.success === 0) return "bg-app-danger/30";
    if (data.failed > 0) return "bg-app-warning/30";
    if (data.success > 5) return "bg-app-success";
    if (data.success > 2) return "bg-app-success/70";
    return "bg-app-success/40";
  }

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="rounded-xl border border-app-border bg-app-card/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-app-text-muted" />
          <span className="text-xs font-semibold text-app-text">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={prevMonth}
            className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors text-sm">
            ◀
          </button>
          <button type="button" onClick={nextMonth}
            className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors text-sm">
            ▶
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-[10px] font-medium text-app-text-muted py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells before the 1st */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const data = dayData[dateKey];
          const isToday =
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

          return (
            <div
              key={dateKey}
              title={data ? `${dateKey}: ✅${data.success} ❌${data.failed}` : dateKey}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-[10px] font-medium transition-colors",
                getCellColor(dateKey),
                isToday && "ring-1 ring-app-primary ring-offset-1 ring-offset-app-card",
                data ? "text-app-text" : "text-app-text-subtle",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-app-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-app-success/40" /> 많음
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-app-success" /> 5회+
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-app-warning/30" /> 혼합
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-app-danger/30" /> 실패
        </span>
      </div>
    </div>
  );
}

function ExecutionHistoryPanel({ parent, onClose }: { parent: Broadcast; onClose: () => void }) {
  const [children, setChildren] = useState<BroadcastChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setExpandedChildId(null);

    api
      .fetchRecurringChildren(parent.id, 50)
      .then((items) => {
        if (mounted) setChildren(items);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message ?? "오류");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [parent.id]);

  const stats = useMemo(() => {
    if (children.length === 0) return null;
    const sent = children.filter((child) => child.status === "sent").length;
    const failed = children.filter((child) => child.status === "failed").length;
    const pending = children.filter((child) => child.status === "pending" || child.status === "sending").length;
    const successRate = Math.round((sent / children.length) * 100);
    return { total: children.length, sent, failed, pending, successRate };
  }, [children]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-app-border bg-app-bg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-card-hover">
                <RefreshCw className="h-4 w-4 text-app-text-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-app-text">실행 기록</p>
                <p className="truncate text-[11px] text-app-text-muted">{parent.message}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
              className={cn(
                "flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors",
                viewMode === "calendar"
                  ? "bg-app-primary text-white"
                  : "bg-app-card-hover text-app-text-muted hover:text-app-text"
              )}
            >
              {viewMode === "calendar" ? <RefreshCw className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
              {viewMode === "calendar" ? "목록" : "캘린더"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
              aria-label="실행 기록 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {stats && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CountPill label="전체" value={stats.total} />
            <CountPill label="성공" value={stats.sent} tone="success" />
            <CountPill label="실패" value={stats.failed} tone="danger" />
            <CountPill
              label="성공률"
              value={`${stats.successRate}%`}
              tone={stats.successRate >= 90 ? "success" : stats.successRate >= 70 ? "warning" : "danger"}
            />
          </div>
        )}

        {/* Calendar heatmap toggle */}
        {!loading && !error && children.length > 0 && viewMode === "calendar" && (
          <div className="mt-3">
            <ExecutionHeatmap>{children}</ExecutionHeatmap>
          </div>
        )}

        {loading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-app-danger/20 bg-app-danger-muted/10 px-4 py-8 text-center">
            <AlertTriangle className="h-5 w-5 text-app-danger" />
            <p className="mt-2 text-xs text-app-danger">{error}</p>
          </div>
        ) : children.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-app-border bg-app-card px-4 py-8 text-center">
            <RefreshCw className="h-5 w-5 text-app-text-subtle" />
            <p className="mt-2 text-xs text-app-text-muted">아직 실행 기록이 없습니다</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain pr-1 md:hidden">
              <div className="space-y-2">
                {children.map((child) => (
                  <HistoryItem
                    key={child.id}
                    child={child}
                    expanded={expandedChildId === child.id}
                    onToggle={() => setExpandedChildId((current) => (current === child.id ? null : child.id))}
                  />
                ))}
              </div>
            </div>

            <div className="hidden max-h-72 overflow-y-auto overscroll-contain pr-1 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">시간</TableHead>
                    <TableHead className="text-[11px]">상태</TableHead>
                    <TableHead className="text-[11px]">메시지</TableHead>
                    <TableHead className="text-[11px]">오류</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell className="whitespace-nowrap font-mono text-[11px] text-app-text-muted">
                        {fmtDT(child.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge tone={(CHILD_META[child.status]?.tone ?? "neutral") as "neutral" | "success" | "warning" | "danger" | "info"}>
                          {CHILD_META[child.status]?.label ?? child.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] break-words text-xs text-app-text">{child.message}</TableCell>
                      <TableCell className="max-w-[220px] break-words text-[11px] text-app-danger">
                        {child.errorMessage ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ScheduleCard({
  broadcast,
  state,
  meta,
  accountName,
  childInfo,
  onPause,
  onResume,
  onCancel,
  onToggleHistory,
  historyOpen,
  onDuplicate,
  onSendNow,
}: {
  broadcast: Broadcast;
  state: RState;
  meta: typeof STATE_META[RState];
  accountName: string;
  childInfo: { last: BroadcastChild | null } | undefined;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
  onDuplicate: () => void;
  onSendNow: () => void;
}) {
  const countdown = useCountdown(broadcast.nextScheduledAt);
  const lastChild = childInfo?.last ?? null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200 touch-manipulation",
        state === "active" && "border-app-border bg-app-card hover:border-app-border-strong hover:shadow-md",
        state === "paused" && "border-app-warning/20 bg-app-warning-muted/10",
        state === "cancelled" && "border-app-border bg-app-bg",
        state === "error" && "border-app-danger/20 bg-app-danger-muted/10",
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone} className="shrink-0 gap-1">
              {meta.icon}
              {meta.label}
            </Badge>
            {state === "error" && <Badge tone="danger">주의 필요</Badge>}
            <span className="truncate rounded-full border border-app-border bg-app-card px-2.5 py-1 text-[11px] font-medium text-app-text-muted">
              {accountName}
            </span>
          </div>

          <p className="break-words text-sm font-semibold leading-snug text-app-text line-clamp-2">
            {broadcast.message}
          </p>

          <div className="flex flex-wrap gap-1.5 text-[11px] text-app-text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-app-card-hover px-2 py-1">
              <Clock className="h-3 w-3" />
              {intervalLabel(broadcast.recurringIntervalMinutes)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-app-card-hover px-2 py-1">
              <SendHorizonal className="h-3 w-3" />
              {broadcast.recipients.length}개 수신자
            </span>
            {lastChild && (
              <span className="inline-flex items-center gap-1 rounded-full bg-app-card-hover px-2 py-1">
                <RefreshCw
                  className={cn(
                    "h-3 w-3",
                    lastChild.status === "sent" && "text-app-success",
                    lastChild.status === "failed" && "text-app-danger",
                  )}
                />
                마지막 {CHILD_META[lastChild.status]?.label ?? lastChild.status} · {fmtRel(lastChild.createdAt)}
              </span>
            )}
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border p-3",
          state === "active" && "border-app-info/20 bg-app-info-muted/10",
          state === "paused" && "border-app-warning/20 bg-app-warning-muted/10",
          state === "cancelled" && "border-app-border bg-app-card",
          state === "error" && "border-app-danger/20 bg-app-danger-muted/10",
        )}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-app-text-subtle">다음 실행</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className={cn("text-base font-semibold", countdown ? "text-app-info" : "text-app-text")}>
              {state === "cancelled"
                ? broadcast.cancelledAt
                  ? `취소됨 · ${fmtDT(broadcast.cancelledAt)}`
                  : "취소됨"
                : broadcast.nextScheduledAt
                  ? fmtDT(broadcast.nextScheduledAt)
                  : "다음 실행 정보 없음"}
            </span>
            {countdown && state !== "cancelled" && (
              <span className="rounded-full bg-app-info-muted/20 px-2 py-1 text-[11px] font-medium text-app-info">
                {countdown}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-app-text-muted">
            {state === "cancelled"
              ? "취소된 일정은 더 이상 자동 실행되지 않습니다."
              : "일정은 유지되며, 다음 실행 시점에 자동으로 발송됩니다."}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {state === "active" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onPause}
              className="min-h-[44px] w-full justify-center border-app-warning/30 text-app-warning hover:bg-app-warning-muted/20 sm:w-auto"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              일시중지
            </Button>
          )}

          {state === "paused" && (
            <Button
              variant="primary"
              size="sm"
              onClick={onResume}
              className="min-h-[44px] w-full justify-center sm:w-auto"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              재개
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onDuplicate}
            className="min-h-[44px] w-full justify-center sm:w-auto"
          >
            <Copy className="h-3.5 w-3.5" />
            복제
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onSendNow}
            className="min-h-[44px] w-full justify-center sm:w-auto"
          >
            <Play className="h-3.5 w-3.5" />
            즉시 발송
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleHistory}
            className="min-h-[44px] w-full justify-center sm:w-auto"
            aria-pressed={historyOpen}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", historyOpen && "animate-spin")} />
            {historyOpen ? "기록 닫기" : "기록 보기"}
          </Button>

          {state !== "cancelled" && (
            <Button
              variant="danger"
              size="sm"
              onClick={onCancel}
              className="min-h-[44px] w-full justify-center sm:w-auto"
            >
              <Ban className="h-3.5 w-3.5" />
              취소
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function RecurringScheduleTab() {
  const accounts = useDashboardStore((state) => state.accounts);
  const selectedAccountId = useDashboardStore((state) => state.selectedAccountId);
  const { toast } = useToast();

  const [recurring, setRecurring] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ broadcast: Broadcast; action: "cancel" } | null>(null);
  const [sendNowConfirmId, setSendNowConfirmId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<"pause" | "resume" | "cancel" | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [childData, setChildData] = useState<Record<string, { last: BroadcastChild | null }>>({});

  const [showCreate, setShowCreate] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [formAccountId, setFormAccountId] = useState("");
  const [formRecipients, setFormRecipients] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formInterval, setFormInterval] = useState(60);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRecurring = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await api.fetchRecurringBroadcasts();
      setRecurring(list);

      const results = await Promise.allSettled(
        list.map(async (broadcast) => {
          const children = await api.fetchRecurringChildren(broadcast.id, 1);
          return { id: broadcast.id, last: children[0] ?? null };
        }),
      );

      setChildData((previous) => {
        const next: Record<string, { last: BroadcastChild | null }> = {};
        for (const result of results) {
          if (result.status === "fulfilled") {
            next[result.value.id] = { last: result.value.last };
          }
        }
        for (const broadcast of list) {
          if (!next[broadcast.id] && previous[broadcast.id]) {
            next[broadcast.id] = previous[broadcast.id];
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecurring();
  }, [loadRecurring]);

  useEffect(() => {
    if (!showCreate || formAccountId) return;
    setFormAccountId(selectedAccountId ?? accounts[0]?.id ?? "");
  }, [accounts, formAccountId, selectedAccountId, showCreate]);

  const handleCancel = async () => {
    if (!confirm) return;
    setActionLoading(confirm.broadcast.id);
    try {
      const updated = await api.cancelRecurringBroadcast(confirm.broadcast.id);
      setRecurring((previous) => previous.map((item) => (item.id === confirm.broadcast.id ? { ...item, ...updated } : item)));
      setChildData((previous) => {
        const next = { ...previous };
        delete next[confirm.broadcast.id];
        return next;
      });
      setConfirm(null);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "취소 실패");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNow = async () => {
    if (!sendNowConfirmId) return;
    const broadcast = recurring.find((b) => b.id === sendNowConfirmId);
    if (!broadcast) return;
    setActionLoading(sendNowConfirmId);
    setSendNowConfirmId(null);
    try {
      const updated = await api.sendNowBroadcast(broadcast.id);
      setRecurring((previous) => previous.map((item) => (item.id === broadcast.id ? { ...item, ...updated } : item)));
      toast("success", "즉시 발송이 접수되었습니다.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "즉시 발송 요청에 실패했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (broadcast: Broadcast) => {
    setActionLoading(broadcast.id);
    try {
      const updated = await api.pauseRecurringBroadcast(broadcast.id);
      setRecurring((previous) => previous.map((item) => (item.id === broadcast.id ? { ...item, ...updated } : item)));
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "일시중지 실패");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (broadcast: Broadcast) => {
    setActionLoading(broadcast.id);
    try {
      const updated = await api.unpauseRecurringBroadcast(broadcast.id);
      setRecurring((previous) => previous.map((item) => (item.id === broadcast.id ? { ...item, ...updated } : item)));
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "재개 실패");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async () => {
    if (!confirmBulk) return;
    const targets = recurring.filter((b) => {
      const state = getRecurringState(b);
      if (confirmBulk === "pause") return state === "active";
      if (confirmBulk === "resume") return state === "paused";
      return state !== "cancelled";
    });
    if (targets.length === 0) {
      toast("info", "해당 상태의 반복 발송이 없습니다.");
      setConfirmBulk(null);
      return;
    }
    let successCount = 0;
    let failCount = 0;
    for (const broadcast of targets) {
      try {
        if (confirmBulk === "pause") {
          await api.pauseRecurringBroadcast(broadcast.id);
        } else if (confirmBulk === "resume") {
          await api.unpauseRecurringBroadcast(broadcast.id);
        } else {
          await api.cancelRecurringBroadcast(broadcast.id);
        }
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (failCount === 0) {
      const labels = { pause: "일시중지", resume: "재개", cancel: "취소" };
      toast("success", `${targets.length}개 반복 발송 ${labels[confirmBulk]} 완료`);
    } else {
      toast("warning", `${successCount}개 성공, ${failCount}개 실패`);
    }
    setConfirmBulk(null);
    await loadRecurring();
  };

  const clearCreateForm = useCallback(() => {
    setShowCreate(false);
    setDuplicateSource(null);
    setFormAccountId("");
    setFormRecipients("");
    setFormMessage("");
    setFormInterval(60);
    setFormError(null);
  }, []);

  const parsedRecipients = useMemo(
    () => formRecipients.split("\n").map((value) => value.trim()).filter(Boolean),
    [formRecipients],
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!formAccountId || !formRecipients.trim() || !formMessage.trim() || formSubmitting) return;

    if (parsedRecipients.length === 0) {
      setFormError("최소 1개의 수신자가 필요합니다.");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.createBroadcast({
        accountId: formAccountId,
        message: formMessage.trim(),
        recipients: parsedRecipients,
        recurringIntervalMinutes: formInterval,
      });
      clearCreateForm();
      await loadRecurring();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDuplicate = useCallback((broadcast: Broadcast) => {
    setFormAccountId(broadcast.accountId);
    setFormRecipients(broadcast.recipients.join("\n"));
    setFormMessage(broadcast.message);
    setFormInterval(broadcast.recurringIntervalMinutes ?? 60);
    setDuplicateSource(broadcast.id);
    setFormError(null);
    setShowCreate(true);
  }, []);

  const stats = useMemo(() => {
    if (recurring.length === 0) return null;
    const active = recurring.filter((broadcast) => getRecurringState(broadcast) === "active").length;
    const paused = recurring.filter((broadcast) => getRecurringState(broadcast) === "paused").length;
    const errorCount = recurring.filter((broadcast) => getRecurringState(broadcast) === "error").length;
    const cancelled = recurring.filter((broadcast) => getRecurringState(broadcast) === "cancelled").length;
    return { total: recurring.length, active, paused, error: errorCount, cancelled };
  }, [recurring]);

  const [filter, setFilter] = useState<RFilter>("all");
  const [sortBy, setSortBy] = useState<"created" | "next_run">("created");

  const visible = useMemo(() => {
    let items = [...recurring];
    if (filter !== "all") {
      items = items.filter((broadcast) => getRecurringState(broadcast) === filter);
    }

    if (sortBy === "next_run") {
      items.sort((a, b) => {
        if (!a.nextScheduledAt) return 1;
        if (!b.nextScheduledAt) return -1;
        return new Date(`${a.nextScheduledAt}Z`).getTime() - new Date(`${b.nextScheduledAt}Z`).getTime();
      });
    } else {
      items.sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime());
    }

    return items;
  }, [filter, recurring, sortBy]);

  const errorCount = stats?.error ?? recurring.filter((broadcast) => getRecurringState(broadcast) === "error").length;
  const needsAttention = errorCount > 0;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-app-text">반복 발송 스케줄러</h1>
          <p className="text-xs text-app-text-muted">반복 발송 일정과 실행 상태를 한 화면에서 확인하고 관리합니다.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {needsAttention && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setFilter("error")}
              className="min-h-[44px]"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              주의 필요 {errorCount}
            </Button>
          )}
          {recurring.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setConfirmBulk("pause")}
                disabled={confirmBulk !== null}
                title="활성 반복 발송 모두 일시중지"
                className="flex items-center gap-1 rounded-xl border border-app-border px-2.5 py-1.5 text-xs text-app-text-muted hover:border-app-warning hover:text-app-warning transition-colors disabled:opacity-40"
              >
                <Pause className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">전체 중지</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulk("resume")}
                disabled={confirmBulk !== null}
                title="일시중지된 반복 발송 모두 재개"
                className="flex items-center gap-1 rounded-xl border border-app-border px-2.5 py-1.5 text-xs text-app-text-muted hover:border-app-success hover:text-app-success transition-colors disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">전체 재개</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulk("cancel")}
                disabled={confirmBulk !== null}
                title="모든 반복 발송 취소"
                className="flex items-center gap-1 rounded-xl border border-app-border px-2.5 py-1.5 text-xs text-app-text-muted hover:border-app-danger hover:text-app-danger transition-colors disabled:opacity-40"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">전체 취소</span>
              </button>
            </>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowCreate(true);
              setFormAccountId(selectedAccountId ?? accounts[0]?.id ?? "");
              setFormError(null);
            }}
            className="min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" />
            새 반복 발송
          </Button>
          <Button variant="secondary" size="sm" onClick={loadRecurring} className="min-h-[44px]">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            새로고침
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountPill label="전체" value={loading ? "-" : stats.total} />
          <CountPill label="활성" value={loading ? "-" : stats.active} tone="success" />
          <CountPill label="일시중지" value={loading ? "-" : stats.paused} tone="warning" />
          <CountPill label="오류" value={loading ? "-" : stats.error} tone={stats.error > 0 ? "danger" : "neutral"} />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-app-border bg-app-card p-0.5">
          {(["all", "active", "paused", "cancelled", "error"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === value ? "bg-app-primary text-white shadow-sm" : "text-app-text-muted hover:text-app-text",
              )}
            >
              {value === "all" ? "전체" : STATE_META[value].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-app-border bg-app-card p-0.5 sm:ml-auto">
          <button
            type="button"
            onClick={() => setSortBy("created")}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
              sortBy === "created" ? "text-app-text" : "text-app-text-muted hover:text-app-text",
            )}
          >
            생성순
          </button>
          <button
            type="button"
            onClick={() => setSortBy("next_run")}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
              sortBy === "next_run" ? "text-app-text" : "text-app-text-muted hover:text-app-text",
            )}
          >
            실행순
          </button>
        </div>
      </div>

      {loading && recurring.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : error && recurring.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-app-danger-muted">
              <XCircle className="h-7 w-7 text-app-danger" />
            </div>
            <p className="text-sm font-semibold text-app-danger">데이터 로드 실패</p>
            <p className="mt-1 text-xs text-app-text-muted">{error}</p>
            <Button variant="primary" onClick={loadRecurring} className="mt-4">
              <RefreshCw className="h-3.5 w-3.5" />
              다시 시도
            </Button>
          </div>
        </Panel>
      ) : visible.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-card-hover">
              <CalendarClock className="h-8 w-8 text-app-text-subtle" />
            </div>
            <p className="text-sm font-semibold text-app-text">
              {filter !== "all" ? "조건에 맞는 일정이 없습니다" : "반복 발송 일정이 없습니다"}
            </p>
            <p className="mt-1 max-w-xs text-xs text-app-text-muted">
              {filter !== "all"
                ? "필터를 변경해보세요."
                : "새 반복 발송을 생성하여 정기 메시지를 자동화하세요."}
            </p>
            {filter !== "all" ? (
              <Button variant="secondary" onClick={() => setFilter("all")} className="mt-3">
                전체 보기
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setShowCreate(true);
                  setFormAccountId(selectedAccountId ?? accounts[0]?.id ?? "");
                }}
                className="mt-4"
              >
                <Plus className="h-3.5 w-3.5" />
                새 반복 발송 만들기
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <div className="space-y-2">
          {visible.map((broadcast) => {
            const state = getRecurringState(broadcast);
            const meta = STATE_META[state];
            const childInfo = childData[broadcast.id];
            const label = accountLabel(accounts, broadcast.accountId);

            return (
              <div key={broadcast.id}>
                <ScheduleCard
                  broadcast={broadcast}
                  state={state}
                  meta={meta}
                  accountName={label}
                  childInfo={childInfo}
                  onPause={() => handlePause(broadcast)}
                  onResume={() => handleResume(broadcast)}
                  onCancel={() => setConfirm({ broadcast, action: "cancel" })}
                  onToggleHistory={() => setHistoryId((current) => (current === broadcast.id ? null : broadcast.id))}
                  historyOpen={historyId === broadcast.id}
                  onDuplicate={() => handleDuplicate(broadcast)}
                  onSendNow={() => setSendNowConfirmId(broadcast.id)}
                />
                <AnimatePresence>
                  {historyId === broadcast.id && (
                    <ExecutionHistoryPanel parent={broadcast} onClose={() => setHistoryId(null)} />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <Panel title={duplicateSource ? "반복 발송 복제" : "새 반복 발송 생성"}>
              <form onSubmit={handleCreate} noValidate>
                <div className="space-y-4">
                  {duplicateSource && (
                    <div className="flex items-start gap-2 rounded-xl border border-app-primary/20 bg-app-primary-muted/20 px-3 py-2.5 text-xs text-app-primary">
                      <Copy className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>기존 반복 발송 설정을 불러왔습니다. 내용을 확인하고 수정한 뒤 저장하세요.</span>
                    </div>
                  )}

                  <Field label="계정">
                    <Select
                      value={formAccountId}
                      onChange={(event) => setFormAccountId(event.target.value)}
                      required
                      disabled={accounts.length === 0}
                    >
                      <option value="">계정 선택</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name?.trim() || account.phone}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="메시지" hint="복제한 경우 원본 메시지가 미리 채워집니다.">
                    <Textarea
                      rows={5}
                      value={formMessage}
                      onChange={(event) => setFormMessage(event.target.value)}
                      placeholder="보낼 메시지를 입력하세요"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="min-h-28"
                    />
                  </Field>

                  <Field label="수신자" hint="한 줄에 하나씩 입력하세요. @username 또는 chat ID를 지원합니다.">
                    <Textarea
                      rows={4}
                      value={formRecipients}
                      onChange={(event) => setFormRecipients(event.target.value)}
                      placeholder="-100123456789\n@username"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="min-h-24"
                    />
                  </Field>

                  <Field label="반복 간격">
                    <Select value={formInterval} onChange={(event) => setFormInterval(Number(event.target.value))}>
                      {RECURRING_INTERVALS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {formError && <p className="rounded-xl border border-app-danger/20 bg-app-danger-muted/10 px-3 py-2 text-xs text-app-danger">{formError}</p>}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={clearCreateForm} className="min-h-[44px]">
                      취소
                    </Button>
                    <Button type="submit" variant="primary" loading={formSubmitting} className="min-h-[44px]">
                      생성
                    </Button>
                  </div>
                </div>
              </form>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirm?.action === "cancel"}
        title="반복 발송 취소"
        description={`"${confirm?.broadcast.message.slice(0, 50)}" 반복 발송을 영구 취소합니다.`}
        confirmLabel="취소하기"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={!!sendNowConfirmId}
        title="즉시 발송"
        description={
          sendNowConfirmId
            ? `"${recurring.find((b) => b.id === sendNowConfirmId)?.message?.slice(0, 50)}" — 이 반복 발송을 지금 즉시 1회 실행할까요? 원본 일정은 변경되지 않습니다.`
            : ""
        }
        confirmLabel="즉시 발송"
        onConfirm={handleSendNow}
        onCancel={() => setSendNowConfirmId(null)}
      />

      <ConfirmDialog
        open={confirmBulk !== null}
        title={
          confirmBulk === "pause" ? "전체 일시중지"
          : confirmBulk === "resume" ? "전체 재개"
          : "전체 취소"
        }
        description={
          confirmBulk === "pause"
            ? "현재 활성 상태인 반복 발송을 모두 일시중지합니다."
            : confirmBulk === "resume"
            ? "일시중지된 모든 반복 발송을 재개합니다."
            : "모든 반복 발송을 영구 취소합니다. 이 작업은 되돌릴 수 없습니다."
        }
        confirmLabel={
          confirmBulk === "pause" ? "전체 중지"
          : confirmBulk === "resume" ? "전체 재개"
          : "전체 취소"
        }
        variant={confirmBulk === "cancel" ? "danger" : "default"}
        onConfirm={handleBulkAction}
        onCancel={() => setConfirmBulk(null)}
      />
    </div>
  );
}
