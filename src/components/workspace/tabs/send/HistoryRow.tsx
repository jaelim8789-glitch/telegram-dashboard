"use client";

import { useCountdown } from "@/lib/useRecurringCountdown";
import { formatRelativeTime, formatDateTime, formatDuration } from "@/lib/formatTime";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import {
  isBroadcastInFlight, isRecurringActive, isRecurringBroadcast,
} from "@/types";
import type { Broadcast, BroadcastStatus } from "@/types";
import {
  AlertTriangle, CheckCircle2, Clock, Copy, Delete,
  FileWarning, Hourglass, RefreshCw, RotateCcw,
  Users2, XCircle, ExternalLink, ArrowUp,
  Play, Pause,
} from "lucide-react";

import { STATUS_META } from "@/lib/statusMeta";

const FAILURE_ACTION_MAP: Record<string, { actions: string[]; suggestion: string }> = {
  rate_limited: { actions: ["시간 후 자동 재시도"], suggestion: "계정당 1분에 1회로 제한됩니다." },
  "세션이 만료": { actions: ["계정 재인증"], suggestion: "계정 등록 탭에서 인증을 다시 진행해주세요." },
  "인증되지 않": { actions: ["계정 재인증"], suggestion: "계정 등록 탭에서 인증을 완료해주세요." },
  "차단": { actions: ["계정 복구"], suggestion: "Telegram에서 차단된 계정입니다. 복구 후 다시 시도하세요." },
  "그룹을 찾을 수 없": { actions: ["그룹 확인"], suggestion: "대상 그룹이 삭제되었거나 접근 권한이 없습니다." },
  "그룹에 참여": { actions: ["그룹 확인"], suggestion: "대상 그룹에 봇/계정이 참여하고 있지 않습니다." },
  "시간이 초과": { actions: ["재발송"], suggestion: "발송 시간이 초과되었습니다. 다시 시도해주세요." },
};

function parseFailureAction(errorMessage: string | null): { hint: string; suggestion: string } | null {
  if (!errorMessage) return null;
  for (const [key, val] of Object.entries(FAILURE_ACTION_MAP)) {
    if (errorMessage.includes(key)) {
      return { hint: val.actions.join(" / "), suggestion: val.suggestion };
    }
  }
  return { hint: "재발송", suggestion: "재시도 후에도 문제가 지속되면 관리자에게 문의하세요." };
}

interface HistoryRowProps {
  h: Broadcast;
  cancelling: string | null;
  retrying: string | null;
  onCancelClick: (b: Broadcast) => void;
  onRetry: (b: Broadcast) => void;
  onReuse: (b: Broadcast) => void;
  onClone: (b: Broadcast) => void;
  onPauseResume?: (b: Broadcast) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function HistoryRow({
  h,
  cancelling,
  retrying,
  onCancelClick,
  onRetry,
  onReuse,
  onClone,
  onPauseResume,
  selected,
  onToggleSelect,
}: HistoryRowProps) {
  const meta = STATUS_META[h.status];
  const Icon = meta.icon;
  const isFailed = h.status === "failed";
  const isSending = h.status === "sending";
  const isSent = h.status === "sent";
  const isCancelled = h.status === "cancelled";
  const isFutureSchedule = h.status === "pending" && h.scheduledAt && new Date(`${h.scheduledAt}Z`) > new Date();
  const recurring = isRecurringActive(h);
  const recurringCancelled = isCancelled && isRecurringBroadcast(h);
  const canStop = isBroadcastInFlight(h) || recurring;
  const countdown = useCountdown(recurring ? h.nextScheduledAt : null);
  const duration = formatDuration(h.scheduledAt || h.createdAt, h.sentAt);
  const failureInfo = parseFailureAction(h.errorMessage);

  return (
    <div
      className={cn(
        "group flex items-stretch gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all",
        selected && "border-app-primary/40 bg-app-primary/5",
        isFailed && "border-app-danger/20 bg-app-danger-muted/20",
        recurringCancelled && "border-app-warning/20 bg-app-warning-muted/20",
        isSending && "border-app-info/20 bg-app-info-muted/10",
        !isFailed && !recurringCancelled && !isSending && "border-app-border bg-app-bg/60 hover:border-app-border-strong",
      )}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <div className="flex items-center pt-1">
          <input type="checkbox" checked={!!selected}
            onChange={() => onToggleSelect(h.id)}
            className="h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-primary/30 cursor-pointer"
          />
        </div>
      )}
      {/* Status indicator bar */}
      <div className={cn(
        "mt-1 w-1 shrink-0 rounded-full",
        isFailed && "bg-app-danger",
        isSending && "bg-app-info",
        isSent && "bg-app-success",
        isCancelled && "bg-app-warning",
        !isFailed && !isSending && !isSent && !isCancelled && "bg-app-text-subtle/30",
      )} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className={cn(
            "h-3.5 w-3.5 shrink-0",
            isSending && "animate-spin text-app-info",
            isFailed && "text-app-danger",
            isSent && "text-app-success",
            isCancelled && "text-app-warning",
            !isFailed && !isSending && !isSent && !isCancelled && "text-app-text-subtle",
          )} />
          <span className="truncate font-medium text-app-text">{h.message}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-app-text-subtle">
          {/* Recipients */}
          <span className="inline-flex items-center gap-1 rounded-md bg-app-card-hover px-1.5 py-0.5 font-mono">
            <Users2 className="h-3 w-3" />{h.recipients.length}명
          </span>

          {/* Time info */}
          {h.sentAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(h.sentAt)}
            </span>
          ) : isFutureSchedule && h.scheduledAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(h.scheduledAt)} 예약
            </span>
          ) : h.createdAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(h.createdAt)}
            </span>
          ) : null}

          {/* Duration */}
          {duration && (
            <span className="rounded-md bg-app-card-hover px-1.5 py-0.5 font-mono text-[10px]">
              {duration}
            </span>
          )}

          {/* Recurring */}
          {recurring && <Badge tone="info">반복</Badge>}

          {/* Countdown */}
          {countdown && (
            <span className="font-mono text-app-info">{countdown}</span>
          )}

          {/* Error message */}
          {h.errorMessage && (
            <span className="inline-flex items-center gap-1 text-app-danger" title={h.errorMessage}>
              <FileWarning className="h-3 w-3" />
              <span className="truncate max-w-[160px]">{h.errorMessage}</span>
            </span>
          )}

          {/* Inline buttons indicator */}
          {h.inlineButtons && h.inlineButtons.length > 0 && (
            <span className="inline-flex items-center gap-1 text-app-info">
              <ExternalLink className="h-3 w-3" />
              <span className="text-[10px]">{h.inlineButtons.length}개 버튼</span>
            </span>
          )}
        </div>

        {/* Progress bar — real-time for sending, summary for others */}
        <div className="mt-2 w-full">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-app-border/50" role="progressbar"
            aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={isSending ? 50 : isSent ? 100 : isFailed ? 0 : 0}
            aria-label={isSending ? "발송 진행 중" : isSent ? "발송 완료" : isFailed ? "발송 실패" : "대기 중"}>
            {isSending ? (
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-app-info/30" />
                <div
                  className="h-full rounded-full bg-app-info transition-all duration-1000"
                  style={{
                    width: `${Math.min(95, 20 + (Date.now() % 30000) / 30000 * 60)}%`,
                    animation: "none",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            ) : isSent ? (
              <div className="h-full w-full rounded-full bg-app-success" />
            ) : isFailed ? (
              <div className="h-full w-3/4 rounded-full bg-app-danger" />
            ) : (
              <div className="h-full w-1/3 rounded-full bg-app-text-subtle/30" />
            )}
          </div>
          {isSending && (
            <div className="mt-1 flex items-center justify-between text-[10px] text-app-text-muted">
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                발송 진행 중...
              </span>
              <span>{h.recipients.length}명 대상</span>
            </div>
          )}
        </div>

        {/* Failure action hint */}
        {isFailed && failureInfo && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className="rounded-md bg-app-card-hover px-1.5 py-0.5 font-medium text-app-danger">{failureInfo.hint}</span>
            <span className="text-app-text-muted">{failureInfo.suggestion}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-start gap-1">
        {/* Clone button */}
        <button
          type="button"
          onClick={() => onClone(h)}
          title="복제하여 새 발송"
          className="flex h-7 w-7 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        {/* Reuse button */}
        <button
          type="button"
          onClick={() => onReuse(h)}
          title="설정 불러오기"
          className="flex h-7 w-7 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>

        {/* Disabled cancel for future schedule */}
        {isFutureSchedule && (
          <button
            type="button"
            title="예약 취소 (미지원)"
            className="flex h-7 w-7 items-center justify-center rounded-full text-app-text-subtle transition-colors hover:bg-app-card-hover disabled:opacity-40"
            disabled
          >
            <Delete className="h-3.5 w-3.5" />
          </button>
        )}

        {recurring && !recurringCancelled && (
          <>
            {h.isRecurringPaused ? (
              <button
                type="button"
                onClick={() => onPauseResume?.(h)}
                title="반복 재개"
                className="flex h-7 w-7 items-center justify-center rounded-full text-app-success transition-colors hover:bg-app-success-muted"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPauseResume?.(h)}
                title="반복 일시정지"
                className="flex h-7 w-7 items-center justify-center rounded-full text-app-warning transition-colors hover:bg-app-warning-muted"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        {canStop && (
          <button
            type="button"
            onClick={() => onCancelClick(h)}
            disabled={cancelling === h.id}
            title={recurring ? "반복 취소" : "발송 중단"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-app-warning transition-colors hover:bg-app-warning-muted disabled:opacity-40"
          >
            <XCircle className={`h-3.5 w-3.5 ${cancelling === h.id ? "animate-spin" : ""}`} />
          </button>
        )}

        {isFailed && (
          <button
            type="button"
            onClick={() => onRetry(h)}
            disabled={retrying === h.id}
            title="재발송"
            className="flex h-7 w-7 items-center justify-center rounded-full text-app-danger transition-colors hover:bg-app-danger-muted disabled:opacity-40"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${retrying === h.id ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}
