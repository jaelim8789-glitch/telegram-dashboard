"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, Copy, Delete, FileWarning, Eye,
  Hourglass, MessageSquare, RefreshCw, RotateCcw, Search, SearchX, Users, X,
  Send as SendIcon, Users2, XCircle, AlertCircle, MessageCircle,
  ExternalLink, Plus, Trash2, ArrowUp, ArrowDown,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Panel } from "@/components/ui/Panel";
import { Field, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { GroupSelectCard } from "@/components/workspace/tabs/send/GroupSelectCard";
import { useDashboardStore, addRecentRecipientSet, getRecentRecipientSets } from "@/store/useDashboardStore";
import { useAccountCache, useRuntimeActions } from "@/lib/useAccountCache";
import { RuntimeManager } from "@/lib/runtimeManager";
import { useFavoriteGroups, useGroupTags, useRecentGroups } from "@/lib/groupPreferences";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  RECURRING_INTERVALS, NORMAL_DELAY_OPTIONS,
  isBroadcastInFlight, isRecurringActive, isRecurringBroadcast,
  type Broadcast, type BroadcastStatus, type Group,
} from "@/types";
import { useCountdown } from "@/lib/useRecurringCountdown";
import { saveSendDraft, loadSendDraft, clearSendDraft as clearPersistedDraft } from "@/lib/sendDraft";
import { useToast } from "@/components/ui/Toast";
import {
  loadTemplates, saveTemplate as persistTemplate,
  deleteTemplate as removeTemplate,
  toggleTemplateFavorite,
  TEMPLATE_VARIABLES,
  type MessageTemplate,
} from "@/lib/messageTemplates";
import { MessagePreviewModal } from "@/components/workspace/MessagePreviewModal";
import { Modal } from "@/components/ui/Modal";

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

import { formatRelativeTime, formatDateTime, formatDuration } from "@/lib/formatTime";

function parseFailureAction(errorMessage: string | null): { hint: string; suggestion: string } | null {
  if (!errorMessage) return null;
  for (const [key, val] of Object.entries(FAILURE_ACTION_MAP)) {
    if (errorMessage.includes(key)) {
      return { hint: val.actions.join(" / "), suggestion: val.suggestion };
    }
  }
  return { hint: "재발송", suggestion: "재시도 후에도 문제가 지속되면 관리자에게 문의하세요." };
}


function normalizeSelectedRecipients(groups: Group[], selectedIds: string[]): Group[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const seen = new Set<string>();
  const next: Group[] = [];
  for (const id of selectedIds) {
    if (seen.has(id)) continue;
    const group = groupById.get(id);
    if (!group) continue;
    seen.add(id);
    next.push(group);
  }
  return next;
}

function RecipientReviewPanel({
  recipients,
  onRemove,
  onClearAll,
}: {
  recipients: Group[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  if (recipients.length === 0) return null;
  return (
    <div className="rounded-xl border border-app-border bg-app-card/70 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-app-text-muted">수신자 검토</div>
          <div className="text-sm font-semibold text-app-text">
            {recipients.length}명 선택됨
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClearAll} className="shrink-0">
          전체 해제
        </Button>
      </div>

      <div className="mt-3 max-h-40 space-y-1 overflow-y-auto pr-1">
        {recipients.map((recipient) => (
          <div
            key={recipient.id}
            className="flex items-start gap-2 rounded-lg border border-app-border/70 bg-app-bg/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-app-text">{recipient.title}</div>
              <div className="truncate font-mono text-[11px] text-app-text-subtle">{recipient.id}</div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(recipient.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-app-text-subtle transition-colors hover:bg-app-card-hover hover:text-app-text"
              aria-label={`${recipient.title} 제거`}
              title="제거"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


function HistoryRow({
  h,
  cancelling,
  retrying,
  onCancelClick,
  onRetry,
  onReuse,
}: {
  h: Broadcast;
  cancelling: string | null;
  retrying: string | null;
  onCancelClick: (b: Broadcast) => void;
  onRetry: (b: Broadcast) => void;
  onReuse: (b: Broadcast) => void;
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
  const canStop = isBroadcastInFlight(h) || recurring;
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

          {/* Inline buttons indicator */}
          {h.inlineButtons && h.inlineButtons.length > 0 && (
            <span className="inline-flex items-center gap-1 text-app-info">
              <ExternalLink className="h-3 w-3" />
              <span className="text-[10px]">{h.inlineButtons.length}개 버튼</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2 w-full">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-app-border/50" role="progressbar"
            aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={isSending ? undefined : isSent ? 100 : isFailed ? 0 : 0}
            aria-label={isSending ? "발송 진행 중" : isSent ? "발송 완료" : isFailed ? "발송 실패" : "대기 중"}>
            {isSending ? (
              <div className="h-full w-full animate-pulse rounded-full bg-app-info" style={{ animationDuration: '1.5s' }} />
            ) : isSent ? (
              <div className="h-full w-full rounded-full bg-app-success" />
            ) : isFailed ? (
              <div className="h-full w-3/4 rounded-full bg-app-danger" />
            ) : (
              <div className="h-full w-1/3 rounded-full bg-app-text-subtle/30" />
            )}
          </div>
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
        {/* Reuse button */}
        <button
          type="button"
          onClick={() => onReuse(h)}
          title="설정 불러오기"
          className="flex h-7 w-7 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

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

export function SendTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  // ── RuntimeManager 캐시에서 데이터 즉시 로드 ──
  const { groups: cachedGroups, broadcasts: cachedBroadcasts } = useAccountCache(selectedAccountId);
  const runtimeActions = useRuntimeActions();

  const groups = useDashboardStore((s) => s.sendGroups);
  const groupsLoading = useDashboardStore((s) => s.sendGroupsLoading);
  const setGroups = useDashboardStore((s) => s.setSendGroups);
  const setGroupsLoading = useDashboardStore((s) => s.setSendGroupsLoading);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);
  const toggleGroup = useDashboardStore((s) => s.toggleSendGroupId);
  const setSendSelectedGroupIds = useDashboardStore((s) => s.setSendSelectedGroupIds);
  const clearSendRecipients = useDashboardStore((s) => s.clearSendRecipients);
  const message = useDashboardStore((s) => s.sendMessage);
  const setMessage = useDashboardStore((s) => s.setSendMessage);
  const imageFile = useDashboardStore((s) => s.sendImageFile);
  const setImageFile = useDashboardStore((s) => s.setSendImageFile);
  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);

  const { isFavorite, toggleFavorite } = useFavoriteGroups();
  const { recent, markUsed } = useRecentGroups();
  const { tagsByGroup, addTag } = useGroupTags();
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const [savedSendGroupIds, setSavedSendGroupIds] = useState<string[]>([]);

  const savedGroupStorageKey = selectedAccountId ? `saved-send-groups-${selectedAccountId}` : null;

  useEffect(() => {
    if (!savedGroupStorageKey) { setSavedSendGroupIds([]); return; }
    try {
      const stored = localStorage.getItem(savedGroupStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedSendGroupIds(Array.isArray(parsed) ? parsed : []);
      } else {
        setSavedSendGroupIds([]);
      }
    } catch { setSavedSendGroupIds([]); }
  }, [savedGroupStorageKey]);

  useEffect(() => {
    if (!savedGroupStorageKey || !groups.length) return;
    setSavedSendGroupIds((prev) => {
      const valid = prev.filter((id) => groups.some((g) => g.id === id));
      if (valid.length !== prev.length) {
        localStorage.setItem(savedGroupStorageKey, JSON.stringify(valid));
      }
      return valid;
    });
  }, [groups, savedGroupStorageKey]);

  const savedSendGroups = useMemo(
    () => groups.filter((g) => savedSendGroupIds.includes(g.id)),
    [groups, savedSendGroupIds],
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const tags of Object.values(tagsByGroup)) {
      for (const tag of tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }, [tagsByGroup]);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(60);
  const [deliveryMode, setDeliveryMode] = useState<"normal" | "cycle" | "bulk">("normal");
  const [normalDelaySeconds, setNormalDelaySeconds] = useState<number>(60);
  const [replyMacroEnabled, setReplyMacroEnabled] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState("");
  const [inlineButtons, setInlineButtons] = useState<{ label: string; url: string }[]>([]);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [recentSets, setRecentSets] = useState<string[][]>([]);
  const reuseBroadcast = useDashboardStore((s) => s.reuseBroadcast);
  const reuseNotice = useDashboardStore((s) => s.reuseNotice);
  const setReuseNotice = useDashboardStore((s) => s.setReuseNotice);

  const handleReuse = useCallback((b: Broadcast) => {
    reuseBroadcast(b);
    setInlineButtons(b.inlineButtons?.filter((btn) => btn.label && btn.url) ?? []);
    if (b.replyToMessageId != null) {
      setReplyMacroEnabled(true);
      setReplyToMessageId(String(b.replyToMessageId));
    } else {
      setReplyMacroEnabled(false);
      setReplyToMessageId("");
    }
  }, [reuseBroadcast]);

  const [history, setHistory] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HISTORY_FILTER_KEY = "telemon-history-filter";

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_FILTER_KEY);
      if (saved && FILTER_ORDER.includes(saved as HistoryFilter)) return saved as HistoryFilter;
    } catch { /* ignore */ }
    return "all";
  });

  // Persist filter to localStorage on change
  const saveHistoryFilter = useCallback((f: HistoryFilter) => {
    setHistoryFilter(f);
    try { localStorage.setItem(HISTORY_FILTER_KEY, f); } catch { /* ignore */ }
  }, []);
  const [bgPollTick, setBgPollTick] = useState(0);

  const selectedRecipients = useMemo(
    () => normalizeSelectedRecipients(groups, selectedIds),
    [groups, selectedIds],
  );
  const selectedRecipientIds = useMemo(() => selectedRecipients.map((g) => g.id), [selectedRecipients]);

  const { toast } = useToast();
  const draftRestoredRef = useRef(false);
  const isInitialMount = useRef(true);
  const mountGuardRef = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Recent recipient sets ──
  useEffect(() => {
    setRecentSets(getRecentRecipientSets().slice(0, 3));
  }, []);

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
        deliveryMode,
        replyMacroEnabled,
        replyToMessageId,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedAccountId, selectedIds, message, isScheduled, scheduledAtLocal, isRecurring, recurringInterval, deliveryMode, replyMacroEnabled, replyToMessageId]);

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

    const validRecipients = draft.selectedGroupIds;

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
      if (draft.deliveryMode) setDeliveryMode(draft.deliveryMode);
      if (draft.replyMacroEnabled !== undefined) setReplyMacroEnabled(draft.replyMacroEnabled);
      if (draft.replyToMessageId !== undefined) setReplyToMessageId(draft.replyToMessageId);

      toast("info", "이전 작성 내용을 복원했습니다.");
    }

    draftRestoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, accounts.length]);

  // ── Template library ──
  function refreshTemplates() {
    setTemplates(loadTemplates());
  }

  useEffect(() => { refreshTemplates(); }, []);

  function handleSaveTemplate() {
    if (!message.trim()) {
      toast("error", "템플릿으로 저장할 메시지 내용을 입력하세요.");
      return;
    }
    if (!saveTemplateName.trim()) return;
    persistTemplate(saveTemplateName.trim(), message);
    refreshTemplates();
    setSaveTemplateDialogOpen(false);
    setSaveTemplateName("");
    toast("success", `"${saveTemplateName.trim()}" 템플릿이 저장되었습니다.`);
  }

  function handleLoadTemplate(tpl: MessageTemplate) {
    setMessage(tpl.content);
    setTemplateLibraryOpen(false);
    toast("info", `"${tpl.name}" 템플릿을 불러왔습니다.`);
  }

  function handleInsertVariable(variable: string) {
    useDashboardStore.setState({ sendMessage: message + variable });
    toast("info", `변수 ${variable}를 추가했습니다.`);
  }

  function handleDeleteTemplate(id: string) {
    removeTemplate(id);
    refreshTemplates();
  }

  function handleToggleTemplateFavorite(id: string) {
    toggleTemplateFavorite(id);
    refreshTemplates();
  }

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    const result = query
      ? templates.filter((t) => t.name.toLowerCase().includes(query) || t.content.toLowerCase().includes(query))
      : templates;
    return [...result].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [templates, templateSearch]);

  // ── 캐시에서 그룹 데이터를 즉시 로드 (API 호출 없음) ──
  async function loadGroups(accountId: string) {
    if (cachedGroups.length > 0) {
      setGroups(cachedGroups);
      setGroupsLoading(false);
      setGroupsError(null);
    } else {
      setGroupsLoading(true);
      runtimeActions.refreshGroups(accountId);
    }
  }

  // 일반 히스토리 로드: 캐시 우선
  async function loadHistory(accountId: string, silent = false) {
    if (silent) {
      try { setHistory(cachedBroadcasts); } catch { /* silent */ }
      return;
    }
    if (cachedBroadcasts.length > 0) {
      setHistory(cachedBroadcasts);
      setHistoryLoading(false);
    } else {
      setHistoryLoading(true);
      runtimeActions.refreshBroadcasts(accountId).finally(() => {
        setHistory(RuntimeManager.getInstance().getBroadcasts(accountId));
        setHistoryLoading(false);
      });
    }
  }

  // In-flight 브로드캐스트 실시간 폴링: 직접 API 호출 (캐시 bypass)
  async function pollInFlightBroadcasts(accountId: string) {
    try {
      const logs = await api.fetchLogs({ accountId });
      setHistory(logs);
    } catch { /* silent */ }
  }

  // Poll while anything is pending/sending for real-time status updates.
  // In-flight 상태일 때는 캐시를 우회하여 직접 API 호출 (3초 간격 실시간 갱신)
  useEffect(() => {
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (!selectedAccountId || !history.some(isBroadcastInFlight)) return;
    pollTimer.current = setTimeout(() => { pollInFlightBroadcasts(selectedAccountId); }, POLL_INTERVAL_MS);
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
    if (!mountGuardRef.current) {
      clearSendDraft();
      setIsScheduled(false); setScheduledAtLocal("");
      setIsRecurring(false); setRecurringInterval(60);
      setDeliveryMode("normal");
      setReplyMacroEnabled(false); setReplyToMessageId("");
      setSearch("");
    }
    setSubmitError(null);
    setSubmitNotice(null);
    saveHistoryFilter("all");
    if (selectedAccountId) {
      // 캐시에서 즉시 로드
      const manager = RuntimeManager.getInstance();
      const cachedGroups = manager.getGroups(selectedAccountId);
      if (cachedGroups.length > 0) {
        setGroups(cachedGroups);
        setGroupsLoading(false);
      } else {
        runtimeActions.refreshGroups(selectedAccountId);
      }
      const cachedBroadcasts = manager.getBroadcasts(selectedAccountId);
      if (cachedBroadcasts.length > 0) {
        setHistory(cachedBroadcasts);
        setHistoryLoading(false);
      } else {
        runtimeActions.refreshBroadcasts(selectedAccountId);
      }
    } else { setGroups([]); setHistory([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // Clear the mount guard after all mount effects have settled.
  // Using setTimeout(0) ensures this runs after ALL synchronous re-renders
  // triggered by programmatic account switches in the draft restoration effect,
  // so that the guard protects all Effect 7 fires during the mount cycle.
  useEffect(() => {
    const timer = setTimeout(() => { mountGuardRef.current = false; }, 0);
    return () => clearTimeout(timer);
  }, []);

  // 캐시 업데이트 시 로컬 상태 동기화 (백그라운드 fetch 완료 후)
  useEffect(() => {
    if (cachedGroups.length > 0) {
      setGroups(cachedGroups);
      setGroupsLoading(false);
    }
  }, [cachedGroups]);

  useEffect(() => {
    if (cachedBroadcasts.length > 0) {
      setHistory(cachedBroadcasts);
      setHistoryLoading(false);
    }
  }, [cachedBroadcasts]);

  function handleAddTag(groupId: string) {
    const tag = window.prompt("이 그룹에 붙일 태그를 입력하세요.");
    if (tag) addTag(groupId, tag);
  }

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? groups.filter((g) => g.title.toLowerCase().includes(query) || g.id.toLowerCase().includes(query))
      : groups;
    const sorted = [...filtered];
    if (sortMode === "members") sorted.sort((a, b) => (b.participantsCount ?? 0) - (a.participantsCount ?? 0));
    else if (sortMode === "favorites") sorted.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
    return sorted;
  }, [groups, search, sortMode, isFavorite]);

  // visibleGroups에 태그 필터 적용
  const filteredByTag = useMemo(() => {
    if (!tagFilter) return visibleGroups;
    return visibleGroups.filter((g) => (tagsByGroup[g.id] ?? []).includes(tagFilter));
  }, [visibleGroups, tagFilter, tagsByGroup]);

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

  // ── Select All Visible / Deselect All Visible ──
  function handleSelectAllVisible() {
    const available = visibleGroups.filter(
      (g) => !selectedIds.includes(g.id)
    );
    const toSelect = available;
    if (toSelect.length === 0) return;
    const next = [...selectedIds, ...toSelect.map((g) => g.id)];
    setSendSelectedGroupIds(next);
    toast("success", `표시된 결과 ${toSelect.length}개를 선택했습니다.`);
  }

  function handleDeselectAllVisible() {
    const visibleIds = new Set(visibleGroups.map((g) => g.id));
    const next = selectedIds.filter((id) => !visibleIds.has(id));
    if (next.length === selectedIds.length) return;
    setSendSelectedGroupIds(next);
    const count = selectedIds.length - next.length;
    toast("info", `표시된 결과 ${count}개 선택을 해제했습니다.`);
  }

  // ── Recent recipient set restoration ──
  function handleRestoreRecentSet(recentIds: string[]) {
    const availableGroupIds = new Set(groups.map((g) => g.id));
    const valid = recentIds.filter((id) => availableGroupIds.has(id));
    if (valid.length === 0) {
      toast("error", "복원 가능한 대상이 없습니다.");
      return;
    }
    const restored = valid.filter((id) => !selectedIds.includes(id));
    const next = [...selectedIds, ...restored];
    setSendSelectedGroupIds(next);
    if (restored.length < recentIds.length) {
      const skipped = recentIds.length - valid.length;
      toast("info", `최근 대상 ${valid.length}개를 복원했습니다${skipped > 0 ? ` (${skipped}개 대상은 현재 계정에서 사용할 수 없음)` : ""}.`);
    } else {
      toast("success", `최근 대상 ${valid.length}개를 복원했습니다.`);
    }
  }

  function handleSelectSavedSendGroup() {
    const available = savedSendGroups.filter((g) => !selectedIds.includes(g.id));
    if (available.length === 0) {
      toast("info", "모든 발송그룹 대상이 이미 선택되어 있습니다.");
      return;
    }
    const next = [...selectedIds, ...available.map((g) => g.id)];
    setSendSelectedGroupIds(next);
    toast("success", `발송그룹 ${available.length}개를 선택했습니다.`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || selectedRecipientIds.length === 0 || submitting) return;
    const hasMessage = replyMacroEnabled ? !!replyToMessageId.trim() : message.trim().length > 0;
    if (!hasMessage) {
      setSubmitError(replyMacroEnabled ? "답장할 메시지 ID를 입력하세요." : "메시지 내용을 입력하세요.");
      return;
    }
    if (isScheduled && !scheduledAtLocal) return;
    if (isRecurring && !recurringInterval) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const scheduledAtIso = isScheduled && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : undefined;
      const mode = replyMacroEnabled ? "reply" : deliveryMode;
      await api.createBroadcast({
        accountId: selectedAccountId,
        message: replyMacroEnabled ? "" : message.trim(),
        recipients: selectedRecipientIds,
        image: imageFile ?? undefined,
        scheduledAt: scheduledAtIso,
        recurringIntervalMinutes: isRecurring ? recurringInterval : undefined,
        deliveryMode: mode,
        delaySeconds: mode === "normal" ? normalDelaySeconds : undefined,
        replyToMessageId: replyMacroEnabled && replyToMessageId.trim() ? Number(replyToMessageId.trim()) : undefined,
        inlineButtons: inlineButtons.filter((b) => b.label.trim() && b.url.trim()).length > 0
          ? inlineButtons.filter((b) => b.label.trim() && b.url.trim())
          : undefined,
      });
      api.clearIdempotencyKey();
      markUsed(selectedRecipientIds);
      addRecentRecipientSet(selectedRecipientIds);
      setRecentSets(getRecentRecipientSets().slice(0, 3));
      const modeLabel = mode === "cycle" ? "사이클 발송" : mode === "bulk" ? "전체 즉시 발송" : mode === "reply" ? "답장" : "발송";
      if (isRecurring) {
        const intervalLabel = RECURRING_INTERVALS.find((i) => i.value === recurringInterval)?.label ?? `${recurringInterval}분`;
        setSubmitNotice(`✅ 반복 설정 완료 (${intervalLabel} 간격)\n방금 첫 발송이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요.`);
      }
      else if (scheduledAtIso) setSubmitNotice(`${modeLabel}이 예약되었습니다. 아래 발송 이력에서 확인하세요.`);
      else setSubmitNotice(`${modeLabel} 작업이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요.`);

      clearSendDraft();
      clearPersistedDraft();
      setIsScheduled(false); setScheduledAtLocal("");
      setIsRecurring(false); setRecurringInterval(60);
      setDeliveryMode("normal"); setNormalDelaySeconds(60);
      setReplyMacroEnabled(false); setReplyToMessageId("");
      setInlineButtons([]);
      setSearch("");
      await loadHistory(selectedAccountId);
    } catch (err) {
      if (err instanceof api.ApiError && err.isNetworkError) {
        setSubmitError("발송 상태를 확인할 수 없습니다. 로그 탭에서 확인하거나 잠시 후 다시 시도하세요.");
      } else {
        api.clearIdempotencyKey();
        setSubmitError(err instanceof Error ? err.message : "발송 요청에 실패했습니다.");
      }
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

  async function handleStop(broadcast: Broadcast) {
    if (cancelling || !selectedAccountId) return;
    setCancelling(broadcast.id);
    setSubmitError(null);
    setSubmitNotice(null);
    const isRecurringBroadcastItem = isRecurringBroadcast(broadcast);
    try {
      await api.stopBroadcast(broadcast.id);
      setSubmitNotice(isRecurringBroadcastItem ? "반복 발송이 취소되었습니다." : "발송이 중단되었습니다.");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "발송 중단에 실패했습니다.");
    } finally { setCancelling(null); }
  }

  function handleCancelClick(b: Broadcast) {
    setCancelTarget(b);
    setCancelConfirmOpen(true);
  }

  const cancelDialogTitle = cancelTarget && isRecurringBroadcast(cancelTarget) ? "반복 발송 취소" : "발송 중단";
  const cancelDialogDescription = cancelTarget
    ? isRecurringBroadcast(cancelTarget)
      ? `"${cancelTarget.message?.slice(0, 50)}"의 반복 발송을 취소할까요?`
      : `"${cancelTarget.message?.slice(0, 50)}" 발송을 중단할까요?`
    : "";

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

  const cycleMinutes = selectedRecipientIds.length; // N개 방 = N분 사이클
  const canSubmit = !submitting && selectedRecipientIds.length > 0 && (replyMacroEnabled ? replyToMessageId.trim().length > 0 : message.trim().length > 0) && (!isScheduled || !!scheduledAtLocal) && (!isRecurring || !!recurringInterval);

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
        description={`${account.name ?? account.phone} · 계정당 1분 간격`}
      >
        {/* ── Today Stats ── */}
        {account && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-card/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-1 text-app-text-muted">
              <SendIcon className="h-3 w-3" />
              오늘 <span className="font-medium text-app-text">{account.todaySent}</span>
            </span>
          </div>
        )}
        <form id="send-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* ── Smart Selection Bar ── */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-app-border bg-app-card/50 px-3 py-2 text-xs">
              <span className="flex items-center gap-1 whitespace-nowrap text-app-text-muted">
                <Users className="h-3.5 w-3.5" />
                전체 <span className="font-medium text-app-text">{groups.length}</span>
              </span>
              <span className="text-app-text-subtle">·</span>
              <span className="whitespace-nowrap text-app-text-muted">
                표시 <span className="font-medium text-app-text">{visibleGroups.length}</span>
              </span>
              <span className="text-app-text-subtle">·</span>
              <span className="whitespace-nowrap text-app-text-muted">
                선택 <span className="font-medium text-app-text">
                  {selectedRecipientIds.length}
                </span>
              </span>
              <span className="text-app-text-subtle">·</span>
              <span className="whitespace-nowrap text-app-text-muted">
                무제한 선택 가능
              </span>
            </div>

            {/* ── Recent Recipient Sets ── */}
            {recentSets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-app-text-muted">최근 대상:</span>
                {recentSets.map((set, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRestoreRecentSet(set)}
                    className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-card px-2.5 py-1 text-[11px] text-app-text-muted transition-colors hover:border-app-border-strong hover:text-app-text"
                  >
                    <Users2 className="h-3 w-3" />
                    {set.length}개
                  </button>
                ))}
              </div>
            )}

            {/* Group selector */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-app-text-muted">
                  <Users2 className="h-3.5 w-3.5" />
                  발송 대상
                </span>
                <div className="flex items-center gap-1.5">
                  {visibleGroups.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="rounded-lg border border-app-border px-2 py-1 text-[11px] text-app-text-muted transition-colors hover:border-app-border-strong hover:text-app-text"
                      >
                        현재 결과 전체 선택
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllVisible}
                        disabled={!visibleGroups.some((g) => selectedIds.includes(g.id))}
                        className="rounded-lg border border-app-border px-2 py-1 text-[11px] text-app-text-muted transition-colors hover:border-app-border-strong hover:text-app-text disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        현재 결과 선택 해제
                      </button>
                    </>
                  )}
                  <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-auto">
                    <option value="default">기본 정렬</option>
                    <option value="members">멤버 많은순</option>
                    <option value="favorites">즐겨찾기 우선</option>
                  </Select>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative mb-2">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="그룹/채널 이름 또는 ID 검색"
                  className="w-full rounded-xl border border-app-border bg-app-card py-2.5 pl-8 pr-8 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-app-text-subtle hover:bg-app-card-hover hover:text-app-text transition-colors"
                    title="검색 지우기"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Tag filter chips */}
              {allTags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setTagFilter(null)}
                    className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${!tagFilter ? 'bg-app-primary text-white' : 'bg-app-card-hover text-app-text-muted hover:text-app-text'}`}>
                    전체
                  </button>
                  {allTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                      className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${tagFilter === tag ? 'bg-app-primary text-white' : 'bg-app-card-hover text-app-text-muted hover:text-app-text'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {deliveryMode === "bulk" && (
                <p className="mb-2 text-xs text-app-text-muted">한 번에 모든 방에 전송합니다.</p>
              )}

              {!groupsLoading && savedSendGroups.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xs font-medium text-app-text-muted">내 발송그룹</span>
                    <span className="h-px flex-1 bg-app-border/50" />
                    <button type="button" onClick={handleSelectSavedSendGroup}
                      className="text-[10px] text-app-primary hover:underline">모두 선택</button>
                    <span className="text-[10px] text-app-text-subtle">{savedSendGroups.length}개</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {savedSendGroups.map((g) => {
                      const selected = selectedRecipientIds.includes(g.id);
                      return (
                        <GroupSelectCard
                          key={g.id}
                          group={g}
                          selected={selected}
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
                </div>
              )}

              {!groupsLoading && groups.length > 0 && (
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium text-app-text-muted">전체 대화방</span>
                  <span className="h-px flex-1 bg-app-border/50" />
                  <span className="text-[10px] text-app-text-subtle">{visibleGroups.length}개</span>
                </div>
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
                  {filteredByTag.map((g) => {
                    const selected = selectedRecipientIds.includes(g.id);
                    return (
                      <GroupSelectCard
                        key={g.id}
                        group={g}
                        selected={selected}
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
                <div className="flex flex-col items-center gap-2 py-6 text-app-text-muted">
                  <SearchX className="h-8 w-8" />
                  <p className="text-sm">일치하는 그룹이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs text-app-primary hover:underline"
                  >
                    검색 지우기
                  </button>
                </div>
              )}
            </div>

            {selectedRecipients.length > 0 && (
              <RecipientReviewPanel
                recipients={selectedRecipients}
                onRemove={toggleGroup}
                onClearAll={clearSendRecipients}
              />
            )}

            {/* Message */}
            {replyMacroEnabled ? (
              <>
                <div className="rounded-xl border border-app-border bg-app-card/50 p-3">
                  <Field label="답장할 메시지 ID">
                    <input type="number" value={replyToMessageId}
                      onChange={(e) => setReplyToMessageId(e.target.value)}
                      placeholder="예: 12345"
                      min="1"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary/60" />
                  </Field>
                  {!replyToMessageId.trim() && (
                    <p className="mt-1.5 text-xs text-app-text-muted">
                      메시지 ID를 입력하면 발송 버튼이 활성화됩니다.
                    </p>
                  )}
                  <div className="mt-2">
                    <Field label="파일 첨부 (선택)">
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                        onChange={(e) => { const f = e.target.files?.[0] ?? null; setImageFile(f); }}
                        className="block w-full text-sm text-app-text-muted file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-card file:px-2.5 file:py-1.5 file:text-app-text" />
                    </Field>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Field label="메시지 내용">
                  <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="발송할 메시지를 입력하세요." required />
                </Field>
                {/* Template library toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-app-border bg-app-card/30 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => { refreshTemplates(); setTemplateLibraryOpen(!templateLibraryOpen); }}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
                  >
                    <Copy className="h-3 w-3" /> 템플릿
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSaveTemplateName(""); setSaveTemplateDialogOpen(true); }}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
                  >
                    <Plus className="h-3 w-3" /> 현재 메시지 저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    disabled={!message.trim()}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Eye className="h-3 w-3" /> 미리보기
                  </button>
                  <span className="mx-1 h-3 w-px bg-app-border" />
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      title={v.label}
                      className="rounded-md bg-app-card-hover px-1.5 py-0.5 font-mono text-[10px] text-app-info hover:bg-app-info-muted/30 transition-colors"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>

                {/* Template library dropdown */}
                {templateLibraryOpen && (
                  <div className="rounded-xl border border-app-border bg-app-card p-2 space-y-2">
                    {/* Search inside template library */}
                    <div className="relative">
                      <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-app-text-subtle" />
                      <input
                        type="text"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="템플릿 검색..."
                        className="w-full rounded-lg border border-app-border bg-app-bg py-1.5 pl-7 pr-2 text-xs text-app-text placeholder:text-app-text-subtle outline-none focus:border-app-primary/60 transition-colors"
                      />
                      {templateSearch && (
                        <button
                          type="button"
                          onClick={() => setTemplateSearch("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded text-app-text-subtle hover:text-app-text"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {filteredTemplates.length > 0 ? (
                      <div className="max-h-48 space-y-0.5 overflow-y-auto">
                        {filteredTemplates.map((tpl) => (
                          <div key={tpl.id} className="group flex items-center gap-1 rounded-lg px-1.5 py-1.5 hover:bg-app-card-hover transition-colors">
                            <button
                              type="button"
                              onClick={() => handleToggleTemplateFavorite(tpl.id)}
                              className={`shrink-0 flex h-5 w-5 items-center justify-center rounded transition-colors ${
                                tpl.isFavorite
                                  ? "text-app-warning hover:text-app-warning/70"
                                  : "text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-warning"
                              }`}
                              title={tpl.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={tpl.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadTemplate(tpl)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="truncate text-xs font-medium text-app-text">{tpl.name}</div>
                              <div className="truncate text-[10px] text-app-text-subtle">{tpl.content}</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="shrink-0 flex h-6 w-6 items-center justify-center rounded text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-danger transition-all"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-app-text-subtle italic">
                        {templates.length === 0
                          ? "저장된 템플릿이 없습니다. 메시지를 작성한 후 '현재 메시지 저장' 버튼을 눌러보세요."
                          : "일치하는 템플릿이 없습니다."}
                      </p>
                    )}
                  </div>
                )}
                <Field label="이미지 (선택)">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-app-text-muted file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-card file:px-2.5 file:py-1.5 file:text-app-text" />
                </Field>
              </>
            )}

            {/* Inline buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-app-text-muted">인라인 버튼 (선택)</span>
                <button
                  type="button"
                  onClick={() => setInlineButtons((prev) => [...prev, { label: "", url: "" }])}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-primary hover:bg-app-primary-muted/20 transition-colors"
                >
                  <Plus className="h-3 w-3" /> 버튼 추가
                </button>
              </div>
              {inlineButtons.length === 0 && (
                <p className="text-[11px] text-app-text-subtle italic">
                  버튼을 추가하면 Telegram 메시지 하단에 클릭 가능한 링크가 표시됩니다.
                </p>
              )}
              {inlineButtons.map((btn, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-xl border border-app-border bg-app-card/50 p-2.5">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={btn.label}
                      onChange={(e) => {
                        const next = [...inlineButtons];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setInlineButtons(next);
                      }}
                      placeholder="버튼 이름"
                      className="rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60"
                    />
                    <input
                      value={btn.url}
                      onChange={(e) => {
                        const next = [...inlineButtons];
                        next[idx] = { ...next[idx], url: e.target.value };
                        setInlineButtons(next);
                      }}
                      placeholder="https://..."
                      className="rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary/60"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const next = [...inlineButtons];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setInlineButtons(next);
                      }}
                      disabled={idx === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card-hover disabled:opacity-30 transition-colors"
                      aria-label="위로"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === inlineButtons.length - 1) return;
                        const next = [...inlineButtons];
                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                        setInlineButtons(next);
                      }}
                      disabled={idx === inlineButtons.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card-hover disabled:opacity-30 transition-colors"
                      aria-label="아래로"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineButtons((prev) => prev.filter((_, i) => i !== idx))}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted/20 transition-colors"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Image */}
            <Field label="이미지 (선택)">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-app-text-muted file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-card file:px-2.5 file:py-1.5 file:text-app-text" />
            </Field>

            {/* Timing & Delivery mode options */}
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

            {(isScheduled || isRecurring) && (
              <p className="text-[11px] text-app-text-subtle italic -mt-1">
                예약 발송과 반복 발송은 동시에 선택할 수 없습니다.
              </p>
            )}

            {/* Delivery Mode Selector — pacing modes don't apply to a single reply send */}
            {!replyMacroEnabled && (
              <div className="rounded-xl border border-app-border bg-app-card/50 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-app-text">
                  <SendIcon className="h-3.5 w-3.5 text-app-text-muted" />
                  발송 방식
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2.5 rounded-lg border border-app-border/60 bg-app-bg/30 p-2.5 cursor-pointer hover:border-app-primary/40 transition-colors">
                    <input type="radio" name="deliveryMode" value="normal" checked={deliveryMode === "normal"}
                      onChange={() => setDeliveryMode("normal")} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-app-text">일반 발송</div>
                      {deliveryMode === "normal" ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-app-text-muted">방마다</span>
                          <select value={normalDelaySeconds}
                            onChange={(e) => setNormalDelaySeconds(Number(e.target.value))}
                            className="rounded-lg border border-app-border bg-app-card px-2 py-1 text-xs text-app-text outline-none focus:border-app-primary/60"
                            onClick={(e) => e.stopPropagation()}>
                            {NORMAL_DELAY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-xs text-app-text-muted">간격으로 순차 전송</span>
                        </div>
                      ) : (
                        <div className="text-xs text-app-text-muted mt-1.5">간격을 선택하세요</div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 rounded-lg border border-app-border/60 bg-app-bg/30 p-2.5 cursor-pointer hover:border-app-primary/40 transition-colors">
                    <input type="radio" name="deliveryMode" value="cycle" checked={deliveryMode === "cycle"}
                      onChange={() => setDeliveryMode("cycle")} className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-app-text">사이클 발송</div>
                      <div className="text-xs text-app-text-muted">방마다 {cycleMinutes}분 주기로 순차 자동 전송 (총 {cycleMinutes}분 소요)</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 rounded-lg border border-app-danger/30 bg-app-danger-muted/20 p-2.5 cursor-pointer hover:border-app-danger/60 transition-colors">
                    <input type="radio" name="deliveryMode" value="bulk" checked={deliveryMode === "bulk"}
                      onChange={() => setDeliveryMode("bulk")} className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-app-text">전체 즉시 발송</div>
                      <div className="text-xs text-app-text-muted">한 번에 모든 방에 전송합니다.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* "답장으로 보내기" toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
                <input type="checkbox" checked={replyMacroEnabled}
                  onChange={(e) => { setReplyMacroEnabled(e.target.checked); if (!e.target.checked) setReplyToMessageId(""); }} />
                <MessageCircle className="h-3.5 w-3.5 text-app-text-muted" />
                답장으로 보내기
              </label>
            </div>

          {submitError && <InlineError className="mt-3">{submitError}</InlineError>}
          {submitNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5 text-xs text-app-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitNotice}</span>
            </div>
          )}
          {reuseNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-app-info/20 bg-app-info-muted px-3 py-2.5 text-xs text-app-info">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{reuseNotice}</span>
              <button
                type="button"
                onClick={() => setReuseNotice(null)}
                className="shrink-0 rounded-full p-0.5 text-app-info/60 hover:text-app-info transition-colors"
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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
                <button key={f} type="button" onClick={() => saveHistoryFilter(f)}
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
                      onReuse={handleReuse}
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
                onReuse={handleReuse}
              />
            ))}
          </div>
        )}

        {!historyLoading && filteredHistory.length === 0 && history.length > 0 && (
          <p className="py-4 text-center text-xs text-app-text-subtle">선택한 상태의 발송 내역이 없습니다.</p>
        )}
      </Panel>

      {/* Stop / Cancel confirmation */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        title={cancelDialogTitle}
        description={cancelDialogDescription}
        confirmLabel={cancelTarget && isRecurringBroadcast(cancelTarget) ? "취소하기" : "중단하기"} cancelLabel="닫기" variant="danger"
        onConfirm={async () => {
          if (!cancelTarget) return;
          await handleStop(cancelTarget);
          setCancelConfirmOpen(false);
          setCancelTarget(null);
        }}
        onCancel={() => { setCancelConfirmOpen(false); setCancelTarget(null); }}
      />

      {/* Message preview modal */}
      <MessagePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        message={message}
        recipientCount={selectedRecipientIds.length}
        accountPhone={account?.phone}
        groupName={selectedRecipients.length > 0 ? selectedRecipients[0].title : undefined}
      />

      {/* Save template dialog */}
      <Modal
        open={saveTemplateDialogOpen}
        onClose={() => { setSaveTemplateDialogOpen(false); setSaveTemplateName(""); }}
        title="메시지 템플릿 저장"
        description="현재 메시지를 템플릿으로 저장합니다. 저장한 템플릿은 나중에 불러와 사용할 수 있습니다."
        size="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSaveTemplateDialogOpen(false); setSaveTemplateName(""); }}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!saveTemplateName.trim()}
              onClick={handleSaveTemplate}
            >
              저장
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-muted">템플릿 이름</label>
            <input
              type="text"
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              placeholder="예: 공지사항 템플릿"
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && saveTemplateName.trim()) {
                  handleSaveTemplate();
                }
              }}
            />
          </div>
          <div className="rounded-xl border border-app-border bg-app-bg/50 p-3">
            <p className="mb-1 text-[11px] font-medium text-app-text-muted">미리보기</p>
            <p className="whitespace-pre-wrap break-words text-sm text-app-text leading-relaxed max-h-28 overflow-y-auto">
              {message.trim() || (
                <span className="text-app-text-subtle italic">메시지 내용이 비어 있습니다.</span>
              )}
            </p>
          </div>
        </div>
      </Modal>

      {/* Floating submit button */}
      <motion.div
        initial={false}
        animate={canSubmit ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.5, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="sticky bottom-4 ml-auto flex w-fit"
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
