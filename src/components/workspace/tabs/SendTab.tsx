"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, Delete, FileWarning,
  Hourglass, MessageSquare, RefreshCw, RotateCcw,
  Send as SendIcon, Users2, XCircle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Panel } from "@/components/ui/Panel";
import { Field, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { GroupSelectCard } from "@/components/workspace/tabs/send/GroupSelectCard";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useFavoriteGroups, useGroupTags, useRecentGroups } from "@/lib/groupPreferences";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  MAX_BROADCAST_RECIPIENTS, RECURRING_INTERVALS,
  isBroadcastInFlight, isRecurringActive, isRecurringBroadcast,
  type Broadcast, type BroadcastStatus,
} from "@/types";
import { useCountdown } from "@/lib/useRecurringCountdown";
import { saveSendDraft, loadSendDraft, clearSendDraft as clearPersistedDraft } from "@/lib/sendDraft";
import { useToast } from "@/components/ui/Toast";

const STATUS_META: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string; icon: typeof Clock }> = {
  pending: { tone: "neutral", label: "대기 중", icon: Hourglass },
  sending: { tone: "info", label: "발송 중", icon: RefreshCw },
  sent: { tone: "success", label: "완료", icon: CheckCircle2 },
  failed: { tone: "danger", label: "실패", icon: AlertTriangle },
  cancelled: { tone: "warning", label: "취소됨", icon: XCircle },
};

const POLL_INTERVAL_MS = 3000;
const HISTORY_POLL_INTERVAL_MS = 30000;
type SortMode = "default" | "members" | "favorites";
type HistoryFilter = BroadcastStatus | "all" | "recurring";

const FILTER_ORDER: HistoryFilter[] = ["all", "pending", "sending", "sent", "failed", "cancelled"];

const FILTER_LABEL: Record<HistoryFilter, string> = {
  all: "전체",
  pending: "대기",
  sending: "발송 중",
  sent: "완료",
  failed: "실패",
  cancelled: "취소",
  recurring: "반복",
};

const FAILURE_ACTION_MAP: Record<string, { actions: string[]; suggestion: string }> = {
  rate_limited: { actions: ["시간 후 자동 재시도"], suggestion: "계정당 1분에 1회로 제한됩니다." },
  "세션이 만료": { actions: ["계정 재인증"], suggestion: "계정 등록 탭에서 인증을 다시 진행해주세요." },
  "인증되지 않": { actions: ["계정 재인증"], suggestion: "계정 등록 탭에서 인증을 완료해주세요." },
  "차단": { actions: ["계정 복구"], suggestion: "Telegram에서 차단된 계정입니다. 복구 후 다시 시도하세요." },
  "그룹을 찾을 수 없": { actions: ["그룹 확인"], suggestion: "대상 그룹이 삭제되었거나 접근 권한이 없습니다." },
  "그룹에 참여": { actions: ["그룹 확인"], suggestion: "대상 그룹에 봇/계정이 참여하고 있지 않습니다." },
  "시간이 초과": { actions: ["재발송"], suggestion: "발송 시간이 초과되었습니다. 다시 시도해주세요." },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

function formatDuration(isoStart: string | null, isoEnd: string | null): string | null {
  if (!isoStart) return null;
  const start = new Date(`${isoStart}Z`).getTime();
  const end = isoEnd ? new Date(`${isoEnd}Z`).getTime() : Date.now();
  const sec = Math.round((end - start) / 1000);
  if (sec < 5) return null;
  if (sec < 60) return `${sec}초`;
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

function parseFailureAction(errorMessage: string | null): { hint: string; suggestion: string } | null {
  if (!errorMessage) return null;
  for (const [key, val] of Object.entries(FAILURE_ACTION_MAP)) {
    if (errorMessage.includes(key)) {
      return { hint: val.actions.join(" / "), suggestion: val.suggestion };
    }
  }
  return { hint: "재발송", suggestion: "재시도 후에도 문제가 지속되면 관리자에게 문의하세요." };
}


function HistoryRow({
  h,
  cancelling,
  retrying,
  onCancelClick,
  onRetry,
}: {
  h: Broadcast;
  cancelling: string | null;
  retrying: string | null;
  onCancelClick: (b: Broadcast) => void;
  onRetry: (b: Broadcast) => void;
}) {
  const meta = STATUS_META[h.status];
  const Icon = meta.icon;
  const isFailed = h.status === "failed";
  const isSending = h.status === "sending";
  const isSent = h.status === "sent";
  const isCancelled = h.status === "cancelled";
  const isFutureSchedule = h.status === "pending" && h.scheduledAt && new Date(`${h.scheduledAt}Z`) > new Date();
  const recurring = isRecurringActive(h);
  const recurringCancelled = isCancelled && isRecurringBroadcast(h);
  const countdown = useCountdown(recurring ? h.nextScheduledAt : null);
  const duration = formatDuration(h.scheduledAt || h.createdAt, h.sentAt);
  const failureInfo = parseFailureAction(h.errorMessage);

  return (
    <div
      className={cn(
        "group flex items-stretch gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all",
        isFailed && "border-app-danger/20 bg-app-danger-muted/20",
        recurringCancelled && "border-app-warning/20 bg-app-warning-muted/20",
        isSending && "border-app-info/20 bg-app-info-muted/10",
        !isFailed && !recurringCancelled && !isSending && "border-app-border bg-app-bg/60 hover:border-app-border-strong",
      )}
    >
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
        {/* Play button for future schedule */}
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

        {recurring && (
          <button
            type="button"
            onClick={() => onCancelClick(h)}
            disabled={cancelling === h.id}
            title="반복 취소"
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

export function SendTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const groups = useDashboardStore((s) => s.sendGroups);
  const groupsLoading = useDashboardStore((s) => s.sendGroupsLoading);
  const setGroups = useDashboardStore((s) => s.setSendGroups);
  const setGroupsLoading = useDashboardStore((s) => s.setSendGroupsLoading);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);
  const toggleGroup = useDashboardStore((s) => s.toggleSendGroupId);
  const message = useDashboardStore((s) => s.sendMessage);
  const setMessage = useDashboardStore((s) => s.setSendMessage);
  const imageFile = useDashboardStore((s) => s.sendImageFile);
  const setImageFile = useDashboardStore((s) => s.setSendImageFile);
  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);

  const { isFavorite, toggleFavorite } = useFavoriteGroups();
  const { recent, markUsed } = useRecentGroups();
  const { tagsByGroup, addTag } = useGroupTags();

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [bgPollTick, setBgPollTick] = useState(0);

  const { toast } = useToast();
  const draftRestoredRef = useRef(false);
  const isInitialMount = useRef(true);

  // ── Draft persistence: auto-save on every meaningful state change ──
  useEffect(() => {
    if (isInitialMount.current) return;
    const timer = setTimeout(() => {
      saveSendDraft({
        savedAt: new Date().toISOString(),
        selectedAccountId: selectedAccountId ?? null,
        selectedGroupIds: selectedIds,
        message,
        isScheduled,
        scheduledAtLocal,
        isRecurring,
        recurringInterval,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedAccountId, selectedIds, message, isScheduled, scheduledAtLocal, isRecurring, recurringInterval]);

  // ── Draft restoration on mount (only once) ──
  useEffect(() => {
    if (draftRestoredRef.current) return;
    if (!selectedAccountId || accounts.length === 0) return;

    const storeHasIntentionalDraft = message.trim().length > 0 || selectedIds.length > 0;
    if (storeHasIntentionalDraft) {
      clearPersistedDraft();
      draftRestoredRef.current = true;
      return;
    }

    const draft = loadSendDraft();
    if (!draft) {
      draftRestoredRef.current = true;
      return;
    }

    const validAccountId = draft.selectedAccountId && accounts.some((a) => a.id === draft.selectedAccountId)
      ? draft.selectedAccountId
      : null;

    const validRecipients = draft.selectedGroupIds.slice(0, MAX_BROADCAST_RECIPIENTS);

    const hasContent = validRecipients.length > 0 || draft.message.trim().length > 0;

    if (hasContent) {
      if (validAccountId && validAccountId !== selectedAccountId) {
        useDashboardStore.getState().selectAccount(validAccountId);
      }
      if (draft.message) {
        useDashboardStore.getState().setSendMessage(draft.message);
      }
      for (const gid of validRecipients) {
        if (!useDashboardStore.getState().sendSelectedGroupIds.includes(gid)) {
          useDashboardStore.getState().toggleSendGroupId(gid);
        }
      }
      setIsScheduled(draft.isScheduled);
      setScheduledAtLocal(draft.scheduledAtLocal);
      setIsRecurring(draft.isRecurring);
      setRecurringInterval(draft.recurringInterval);

      toast("info", "이전 작성 내용을 복원했습니다.");
    }

    draftRestoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, accounts.length]);

  async function loadGroups(accountId: string) {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      setGroups(await api.fetchGroups(accountId));
    } catch (err) {
      setGroups([]);
      setGroupsError(err instanceof Error ? err.message : "그룹 목록을 불러오지 못했습니다.");
    } finally {
      setGroupsLoading(false);
    }
  }

  async function loadHistory(accountId: string, silent = false) {
    if (silent) {
      try {
        const logs = await api.fetchLogs({ accountId });
        setHistory(logs);
      } catch { /* silent refresh */ }
      return;
    }
    setHistoryLoading(true);
    try {
      const logs = await api.fetchLogs({ accountId });
      setHistory(logs);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Poll while anything is pending/sending for real-time status updates.
  useEffect(() => {
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (!selectedAccountId || !history.some(isBroadcastInFlight)) return;
    pollTimer.current = setTimeout(() => { loadHistory(selectedAccountId, true); }, POLL_INTERVAL_MS);
    return () => { if (pollTimer.current) clearTimeout(pollTimer.current); };
  }, [history, selectedAccountId]);

  // 30s background polling independent of in-flight status.
  useEffect(() => {
    if (historyPollTimer.current) { clearTimeout(historyPollTimer.current); historyPollTimer.current = null; }
    if (!selectedAccountId) return;
    historyPollTimer.current = setTimeout(() => { loadHistory(selectedAccountId, true); setBgPollTick((t) => t + 1); }, HISTORY_POLL_INTERVAL_MS);
    return () => { if (historyPollTimer.current) clearTimeout(historyPollTimer.current); };
  }, [bgPollTick, selectedAccountId]);

  async function handleManualRefresh() {
    if (!selectedAccountId || historyRefreshing) return;
    setHistoryRefreshing(true);
    await loadHistory(selectedAccountId);
    setHistoryRefreshing(false);
  }

  // Mark initial mount complete after first render so persistence effect fires.
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  useEffect(() => {
    clearSendDraft();
    setSubmitError(null);
    setSubmitNotice(null);
    setHistoryFilter("all");
    setIsScheduled(false); setScheduledAtLocal("");
    setIsRecurring(false); setRecurringInterval(60);
    if (selectedAccountId) { loadGroups(selectedAccountId); loadHistory(selectedAccountId); }
    else { setGroups([]); setHistory([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  function handleAddTag(groupId: string) {
    const tag = window.prompt("이 그룹에 붙일 태그를 입력하세요.");
    if (tag) addTag(groupId, tag);
  }

  const visibleGroups = useMemo(() => {
    const filtered = groups.filter((g) => g.title.toLowerCase().includes(search.trim().toLowerCase()));
    const sorted = [...filtered];
    if (sortMode === "members") sorted.sort((a, b) => (b.participantsCount ?? 0) - (a.participantsCount ?? 0));
    else if (sortMode === "favorites") sorted.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
    return sorted;
  }, [groups, search, sortMode, isFavorite]);

  /** History summary stats when not filtered by "all" */
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return history;
    return history.filter((h) => h.status === historyFilter);
  }, [history, historyFilter]);

  const statusCounts = useMemo((): Record<string, number> => {
    const counts: Record<string, number> = { all: history.length };
    for (const h of history) counts[h.status] = (counts[h.status] ?? 0) + 1;
    return counts;
  }, [history]);

  /** Chronologically grouped history for the "all" view */
  const groupedHistory = useMemo(() => {
    if (historyFilter !== "all") return null;
    const groups: { label: string; items: Broadcast[] }[] = [];

    const inFlight = history.filter((h) => h.status === "sending" || h.status === "pending");
    if (inFlight.length > 0) groups.push({ label: "진행 중", items: inFlight });

    const todays = history.filter((h) => {
      if (h.status === "sending" || h.status === "pending") return false;
      const d = new Date(`${h.createdAt}Z`);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).slice(0, 20);
    if (todays.length > 0) groups.push({ label: "오늘", items: todays });

    const older = history.filter((h) => {
      if (h.status === "sending" || h.status === "pending") return false;
      const d = new Date(`${h.createdAt}Z`);
      const today = new Date();
      return !(d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear());
    }).slice(0, 50);
    if (older.length > 0) groups.push({ label: "이전", items: older });

    return groups.length > 0 ? groups : null;
  }, [history, historyFilter]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || selectedIds.length === 0 || !message.trim() || submitting) return;
    if (isScheduled && !scheduledAtLocal) return;
    if (isRecurring && !recurringInterval) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const scheduledAtIso = isScheduled && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : undefined;
      await api.createBroadcast({
        accountId: selectedAccountId,
        message: message.trim(),
        recipients: selectedIds,
        image: imageFile ?? undefined,
        scheduledAt: scheduledAtIso,
        recurringIntervalMinutes: isRecurring ? recurringInterval : undefined,
      });
      markUsed(selectedIds);
      if (isRecurring) setSubmitNotice("반복 발송이 설정되었습니다. 아래 발송 이력에서 상태를 확인하세요.");
      else if (scheduledAtIso) setSubmitNotice("발송이 예약되었습니다. 아래 발송 이력에서 확인하세요.");
      else setSubmitNotice("발송 작업이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요.");

      clearSendDraft();
      clearPersistedDraft();
      setIsScheduled(false); setScheduledAtLocal("");
      setIsRecurring(false); setRecurringInterval(60);
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "발송 요청에 실패했습니다.");
    } finally { setSubmitting(false); }
  }

  async function handleRetry(failed: Broadcast) {
    if (retrying || selectedAccountId !== failed.accountId) return;
    setRetrying(failed.id);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      await api.retryBroadcast(failed.id);
      setSubmitNotice("재발송 작업이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요.");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "재발송 요청에 실패했습니다.");
    } finally { setRetrying(null); }
  }

  async function handleCancelRecurring(b: Broadcast) {
    if (cancelling || !selectedAccountId) return;
    setCancelling(b.id);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      await api.cancelRecurringBroadcast(b.id);
      setSubmitNotice("반복 발송이 취소되었습니다.");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "반복 발송 취소에 실패했습니다.");
    } finally { setCancelling(null); }
  }

  function handleCancelClick(b: Broadcast) {
    setCancelTarget(b);
    setCancelConfirmOpen(true);
  }

  /** Quick status summary for the history prefix */
  const statusSummary = useMemo(() => {
    const summary: { label: string; count: number; color: string; key: string }[] = [];
    const order: [BroadcastStatus, string, string][] = [
      ["sending", "발송 중", "bg-app-info"],
      ["pending", "대기", "bg-app-text-subtle"],
      ["sent", "완료", "bg-app-success"],
      ["failed", "실패", "bg-app-danger"],
      ["cancelled", "취소", "bg-app-warning"],
    ];
    for (const [status, label, color] of order) {
      const count = statusCounts[status] ?? 0;
      if (count > 0) summary.push({ label, count, color, key: status });
    }
    return summary;
  }, [statusCounts]);

  if (!account) {
    return (
      <Panel title="메시지 작성" description="발송을 시작하려면 계정을 선택하세요.">
        <EmptyState icon={Users2} title="선택된 계정이 없습니다" description="왼쪽 사이드바에서 계정을 선택한 후 메시지를 발송할 수 있습니다." />
      </Panel>
    );
  }

  const canSubmit = !submitting && selectedIds.length > 0 && message.trim().length > 0 && (!isScheduled || !!scheduledAtLocal) && (!isRecurring || !!recurringInterval);

  return (
    <div className="space-y-4 pb-20">
      {/* ── Compose Panel ── */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <SendIcon className="h-4 w-4 text-app-primary" />
            메시지 작성
          </div>
        }
        description={`${account.name ?? account.phone} · 최대 ${MAX_BROADCAST_RECIPIENTS}개 그룹, 계정당 1분 간격`}
      >
        <form id="send-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Group selector */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-app-text-muted">
                  <Users2 className="h-3.5 w-3.5" />
                  발송 대상 ({selectedIds.length}/{MAX_BROADCAST_RECIPIENTS})
                </span>
                <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-auto">
                  <option value="default">기본 정렬</option>
                  <option value="members">멤버 많은순</option>
                  <option value="favorites">즐겨찾기 우선</option>
                </Select>
              </div>
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="그룹/채널 이름 검색" className="mb-2" />
              {selectedIds.length >= Math.ceil(MAX_BROADCAST_RECIPIENTS * 0.8) && (
                <p className="mb-2 text-xs text-app-warning">최대 {MAX_BROADCAST_RECIPIENTS}개까지 선택 가능합니다.</p>
              )}

              {groupsLoading && (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              )}
              {groupsError && <p className="text-xs text-app-danger">{groupsError}</p>}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <EmptyState icon={Users2} title="참여 중인 그룹/채널이 없습니다" />
              )}
              {!groupsLoading && visibleGroups.length > 0 && (
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {visibleGroups.map((g) => {
                    const selected = selectedIds.includes(g.id);
                    const disabled = !selected && selectedIds.length >= MAX_BROADCAST_RECIPIENTS;
                    return (
                      <GroupSelectCard
                        key={g.id}
                        group={g}
                        selected={selected}
                        disabled={disabled}
                        isFavorite={isFavorite(g.id)}
                        isRecent={recent.includes(g.id)}
                        tags={tagsByGroup[g.id] ?? []}
                        onToggleSelect={toggleGroup}
                        onToggleFavorite={toggleFavorite}
                        onAddTag={handleAddTag}
                      />
                    );
                  })}
                </div>
              )}
              {!groupsLoading && !groupsError && groups.length > 0 && visibleGroups.length === 0 && (
                <p className="text-xs text-app-text-subtle">검색 결과가 없습니다.</p>
              )}
            </div>

            {/* Message */}
            <Field label="메시지 내용">
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="발송할 메시지를 입력하세요." required />
            </Field>

            {/* Image */}
            <Field label="이미지 (선택)">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-app-text-muted file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-card file:px-2.5 file:py-1.5 file:text-app-text" />
            </Field>

            {/* Timing options */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-app-border bg-app-card/50 px-3 py-2.5">
                <label className="flex items-center gap-2 text-sm text-app-text">
                  <input type="checkbox" checked={isScheduled}
                    onChange={(e) => { setIsScheduled(e.target.checked); if (e.target.checked) setIsRecurring(false); }} />
                  <Clock className="h-3.5 w-3.5 text-app-text-muted" />
                  예약 발송
                </label>
                {isScheduled && (
                  <div className="mt-2">
                    <Field label="발송 시각">
                      <input type="datetime-local" value={scheduledAtLocal}
                        onChange={(e) => setScheduledAtLocal(e.target.value)}
                        min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        required={isScheduled}
                        className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60" />
                    </Field>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-app-border bg-app-card/50 px-3 py-2.5">
                <label className="flex items-center gap-2 text-sm text-app-text">
                  <input type="checkbox" checked={isRecurring}
                    onChange={(e) => { setIsRecurring(e.target.checked); if (e.target.checked) setIsScheduled(false); }} />
                  <RefreshCw className="h-3.5 w-3.5 text-app-text-muted" />
                  반복 발송
                </label>
                {isRecurring && (
                  <div className="mt-2">
                    <Field label="반복 간격">
                      <select value={recurringInterval} onChange={(e) => setRecurringInterval(Number(e.target.value))}
                        className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60">
                        {RECURRING_INTERVALS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </div>

          {submitError && <InlineError className="mt-3">{submitError}</InlineError>}
          {submitNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5 text-xs text-app-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitNotice}</span>
            </div>
          )}
        </form>
      </Panel>

      {/* ── History Panel ── */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-app-primary" />
            발송 이력
          </div>
        }
        description={`${history.length}건${statusSummary.length > 0 ? ` · ${statusSummary.map((s) => `${s.label} ${s.count}`).join(" / ")}` : ""}`}
        action={
          <button onClick={handleManualRefresh} disabled={historyLoading || historyRefreshing}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${historyLoading || historyRefreshing ? "animate-spin" : ""}`} />
            새로고침
          </button>
        }
      >
        {/* Status filter pills */}
        {!historyLoading && history.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTER_ORDER.map((f) => {
              const count = statusCounts[f] ?? 0;
              if (f !== "all" && count === 0) return null;
              return (
                <button key={f} type="button" onClick={() => setHistoryFilter(f)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    historyFilter === f ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text",
                  )}>
                  {FILTER_LABEL[f]}
                  {f !== "all" && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {historyLoading && filteredHistory.length === 0 && (
          <div className="space-y-1.5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        )}

        {/* Empty */}
        {!historyLoading && history.length === 0 && (
          <EmptyState icon={SendIcon} title="아직 발송 이력이 없습니다" description="위 양식에서 메시지를 작성하고 발송 버튼을 눌러주세요." />
        )}

        {/* Chronologically grouped history (all filter) */}
        {!historyLoading && groupedHistory && historyFilter === "all" && (
          <div className="space-y-3">
            {groupedHistory.map((g) => (
              <div key={g.label}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">
                    {g.label}
                  </span>
                  <span className="h-px flex-1 bg-app-border/50" />
                  <span className="text-[10px] text-app-text-subtle">{g.items.length}건</span>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((h) => (
                    <HistoryRow
                      key={h.id} h={h}
                      cancelling={cancelling} retrying={retrying}
                      onCancelClick={handleCancelClick} onRetry={handleRetry}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flat list (status filter) */}
        {!historyLoading && groupedHistory === null && filteredHistory.length > 0 && (
          <div className="space-y-1.5">
            {filteredHistory.map((h) => (
              <HistoryRow
                key={h.id} h={h}
                cancelling={cancelling} retrying={retrying}
                onCancelClick={handleCancelClick} onRetry={handleRetry}
              />
            ))}
          </div>
        )}

        {!historyLoading && filteredHistory.length === 0 && history.length > 0 && (
          <p className="py-4 text-center text-xs text-app-text-subtle">선택한 상태의 발송 내역이 없습니다.</p>
        )}
      </Panel>

      {/* Cancel recurring confirmation */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="반복 발송 취소"
        description={`"${cancelTarget?.message?.slice(0, 50)}"의 반복 발송을 취소할까요?`}
        confirmLabel="취소하기" cancelLabel="닫기" variant="danger"
        onConfirm={async () => {
          if (!cancelTarget) return;
          await handleCancelRecurring(cancelTarget);
          setCancelConfirmOpen(false);
          setCancelTarget(null);
        }}
        onCancel={() => { setCancelConfirmOpen(false); setCancelTarget(null); }}
      />

      {/* Floating submit button */}
      <motion.div
        initial={false}
        animate={canSubmit ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="sticky bottom-4 ml-auto flex w-fit"
        style={{ pointerEvents: canSubmit ? "auto" : "none" }}
      >
        <Button type="submit" form="send-form" variant="primary"
          className="rounded-full px-5 py-3 text-sm shadow-lg shadow-app-primary/30" disabled={!canSubmit}>
          <SendIcon className="h-4 w-4" />
          {submitting ? "처리 중..." : isRecurring ? "반복 설정" : isScheduled ? "예약하기" : "발송"}
        </Button>
      </motion.div>
    </div>
  );
}
