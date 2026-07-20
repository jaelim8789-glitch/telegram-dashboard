"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useDashboardStore, addRecentRecipientSet, getRecentRecipientSets } from "@/store/useDashboardStore";
import { useAccountCache, useRuntimeActions } from "@/lib/useAccountCache";
import { RuntimeManager } from "@/lib/runtimeManager";
import * as api from "@/lib/api";
import type {
  Broadcast, Group, GroupFolder, DistributionSibling,
} from "@/types";
import { RECURRING_INTERVALS, isBroadcastInFlight } from "@/types";
import { saveSendDraft, loadSendDraft, clearSendDraft as clearPersistedDraft } from "@/lib/sendDraft";
import { useToast } from "@/components/ui/Toast";
import { loadTemplates, TEMPLATE_VARIABLES, type MessageTemplate as LocalTemplate } from "@/lib/messageTemplates";

type HistoryFilter = Broadcast["status"] | "all" | "recurring";
const POLL_INTERVAL_MS = 3000;
const HISTORY_POLL_INTERVAL_MS = 30000;
const HISTORY_FILTER_KEY = "telemon-history-filter";
const FILTER_ORDER: HistoryFilter[] = ["all", "pending", "sending", "sent", "failed", "cancelled"];

export function useSendForm() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);
  const account = accounts.find((a) => a.id === selectedAccountId);

  // ── Groups state ──
  const groups = useDashboardStore((s) => s.sendGroups);
  const groupsLoading = useDashboardStore((s) => s.sendGroupsLoading);
  const setGroups = useDashboardStore((s) => s.setSendGroups);
  const setGroupsLoading = useDashboardStore((s) => s.setSendGroupsLoading);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // ── Recipients state ──
  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);
  const toggleGroup = useDashboardStore((s) => s.toggleSendGroupId);
  const setSendSelectedGroupIds = useDashboardStore((s) => s.setSendSelectedGroupIds);
  const clearSendRecipients = useDashboardStore((s) => s.clearSendRecipients);

  // ── Message state ──
  const message = useDashboardStore((s) => s.sendMessage);
  const setMessage = useDashboardStore((s) => s.setSendMessage);
  const imageFile = useDashboardStore((s) => s.sendImageFile);
  const setImageFile = useDashboardStore((s) => s.setSendImageFile);
  const imageObjectUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);
  useEffect(() => {
    return () => { if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl); };
  }, [imageObjectUrl]);
  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);

  // ── Template state ──
  const [templates, setTemplates] = useState<LocalTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");

  function refreshTemplates() { setTemplates(loadTemplates()); }
  useEffect(() => { refreshTemplates(); }, []);

  // ── Broadcast options state ──
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(60);
  const [deliveryMode, setDeliveryMode] = useState<"normal" | "cycle" | "bulk" | "reply">("normal");
  const [normalDelaySeconds, setNormalDelaySeconds] = useState<number>(60);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [replyMacroEnabled, setReplyMacroEnabled] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState("");
  const [autoRetry, setAutoRetry] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(3);
  const [autoRetryInterval, setAutoRetryInterval] = useState(5);
  const [inlineButtons, setInlineButtons] = useState<{ label: string; url: string }[]>([]);

  // ── Submission state ──
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  // ── Estimate state ──
  const [estimatePreview, setEstimatePreview] = useState<{
    estimated_seconds: number; estimated_minutes: number; readable: string;
  } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // ── Batch retry state ──
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

  // ── History state ──
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_FILTER_KEY);
      if (saved && FILTER_ORDER.includes(saved as HistoryFilter)) return saved as HistoryFilter;
    } catch { /* ignore */ }
    return "all";
  });

  // ── Distribution state ──
  const [distributionBatchId, setDistributionBatchId] = useState<string | null>(null);
  const [distributionSiblings, setDistributionSiblings] = useState<DistributionSibling[]>([]);

  // ── Refs ──
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const distributionPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toast ──
  const { toast } = useToast();

  // ── Cached data ──
  const { groups: cachedGroups, broadcasts: cachedBroadcasts } = useAccountCache(selectedAccountId);
  const runtimeActions = useRuntimeActions();

  // Persist filter to localStorage on change
  const saveHistoryFilter = useCallback((f: HistoryFilter) => {
    setHistoryFilter(f);
    try { localStorage.setItem(HISTORY_FILTER_KEY, f); } catch { /* ignore */ }
  }, []);

  // ── Draft auto-save ──
  const isInitialMount = useRef(true);
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
  }, [selectedAccountId, selectedIds, message, isScheduled, scheduledAtLocal,
    isRecurring, recurringInterval, deliveryMode, replyMacroEnabled, replyToMessageId]);

  // ── Draft restoration on mount ──
  const draftRestoredRef = useRef(false);
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
    if (!draft) { draftRestoredRef.current = true; return; }
    const validAccountId = draft.selectedAccountId && accounts.some((a) => a.id === draft.selectedAccountId)
      ? draft.selectedAccountId : null;
    const validRecipients = draft.selectedGroupIds;
    const hasContent = validRecipients.length > 0 || draft.message.trim().length > 0;
    if (hasContent) {
      if (validAccountId && validAccountId !== selectedAccountId) {
        useDashboardStore.getState().selectAccount(validAccountId);
      }
      if (draft.message) useDashboardStore.getState().setSendMessage(draft.message);
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

  // ── Load history ──
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

  // ── Poll in-flight ──
  async function pollInFlightBroadcasts(accountId: string) {
    try { const logs = await api.fetchLogs({ accountId }); setHistory(logs); } catch { /* silent */ }
  }

  useEffect(() => {
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (!selectedAccountId || !history.some(isBroadcastInFlight)) return;
    pollTimer.current = setTimeout(() => { pollInFlightBroadcasts(selectedAccountId); }, POLL_INTERVAL_MS);
    return () => { if (pollTimer.current) clearTimeout(pollTimer.current); };
  }, [history, selectedAccountId]);

  useEffect(() => {
    if (historyPollTimer.current) { clearTimeout(historyPollTimer.current); historyPollTimer.current = null; }
    if (!selectedAccountId) return;
    historyPollTimer.current = setTimeout(() => { loadHistory(selectedAccountId, true); }, HISTORY_POLL_INTERVAL_MS);
    return () => { if (historyPollTimer.current) clearTimeout(historyPollTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // ── Distribution status ──
  async function loadDistributionStatus(batchId: string) {
    try {
      const siblings = await api.fetchDistributionStatus(batchId);
      setDistributionSiblings(siblings);
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (distributionPollTimer.current) { clearTimeout(distributionPollTimer.current); distributionPollTimer.current = null; }
    if (!distributionBatchId || !distributionSiblings.some((s) => isBroadcastInFlight(s.broadcast))) return;
    distributionPollTimer.current = setTimeout(() => { loadDistributionStatus(distributionBatchId); }, POLL_INTERVAL_MS);
    return () => { if (distributionPollTimer.current) clearTimeout(distributionPollTimer.current); };
  }, [distributionBatchId, distributionSiblings]);

  // ── Manual refresh ──
  async function handleManualRefresh() {
    if (!selectedAccountId || historyRefreshing) return;
    setHistoryRefreshing(true);
    await loadHistory(selectedAccountId);
    setHistoryRefreshing(false);
  }

  // ── Submit ──
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || selectedRecipientIds.length === 0 || submitting) return;
    if (!message.trim()) { setSubmitError("메시지 내용을 입력하세요."); return; }
    if (isScheduled && !scheduledAtLocal) return;
    if (isRecurring && !recurringInterval) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const scheduledAtIso = isScheduled && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : undefined;
      const effectiveDeliveryMode = replyMacroEnabled && replyToMessageId.trim() ? "reply" : deliveryMode;
      const created = await api.createBroadcast({
        accountId: selectedAccountId,
        message: message.trim(),
        recipients: selectedRecipientIds,
        autoRetry: autoRetry ? { maxRetries: autoRetryCount, intervalMinutes: autoRetryInterval } : undefined,
        image: imageFile ?? undefined,
        scheduledAt: scheduledAtIso,
        recurringIntervalMinutes: isRecurring ? recurringInterval : undefined,
        deliveryMode: effectiveDeliveryMode,
        delaySeconds: effectiveDeliveryMode === "normal" ? normalDelaySeconds : undefined,
        batchSize: effectiveDeliveryMode === "normal" ? batchSize : undefined,
        replyToMessageId: replyMacroEnabled && replyToMessageId.trim() ? Number(replyToMessageId.trim()) : undefined,
        inlineButtons: inlineButtons.filter((b) => b.label.trim() && b.url.trim()).length > 0
          ? inlineButtons.filter((b) => b.label.trim() && b.url.trim()) : undefined,
      });
      api.clearIdempotencyKey();
      if (created.distributionBatchId) {
        setDistributionBatchId(created.distributionBatchId);
        void loadDistributionStatus(created.distributionBatchId);
        setSubmitNotice("발송 대상이 많아 여러 계정에 나눠서 보냅니다. 아래 진행 상태를 확인하세요.");
      } else {
        setDistributionBatchId(null);
        setDistributionSiblings([]);
        if (isRecurring) {
          const intervalLabel = RECURRING_INTERVALS.find((i) => i.value === recurringInterval)?.label ?? `${recurringInterval}분`;
          setSubmitNotice(`반복 설정 완료 (${intervalLabel} 간격)`);
        } else if (scheduledAtIso) setSubmitNotice("예약되었습니다.");
        else setSubmitNotice("발송이 시작되었습니다.");
      }
      clearSendDraft();
      clearPersistedDraft();
      setIsScheduled(false); setScheduledAtLocal("");
      setIsRecurring(false); setRecurringInterval(60);
      setDeliveryMode("normal"); setNormalDelaySeconds(60);
      setReplyMacroEnabled(false); setReplyToMessageId("");
      setAutoRetry(false); setAutoRetryCount(3); setAutoRetryInterval(5);
      setInlineButtons([]);
      await loadHistory(selectedAccountId);
    } catch (err) {
      if (err instanceof api.ApiError && err.isNetworkError) {
        setSubmitError("발송 상태를 확인할 수 없습니다.");
      } else {
        api.clearIdempotencyKey();
        setSubmitError(err instanceof Error ? err.message : "발송 요청에 실패했습니다.");
      }
    } finally { setSubmitting(false); }
  }

  // ── Retry ──
  async function handleRetry(failed: Broadcast) {
    if (retrying || !selectedAccountId || selectedAccountId !== failed.accountId) return;
    setRetrying(failed.id);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      await api.retryBroadcast(failed.id);
      setSubmitNotice("재발송이 시작되었습니다.");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "재발송 요청에 실패했습니다.");
    } finally { setRetrying(null); }
  }

  // ── Batch retry ──
  async function handleBatchRetry() {
    if (batchRetrying || selectedHistoryIds.size === 0) return;
    setBatchRetrying(true);
    try {
      const result = await api.batchRetryBroadcasts(Array.from(selectedHistoryIds));
      setSelectedHistoryIds(new Set());
      if (selectedAccountId) await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "일괄 재발송에 실패했습니다.");
    } finally { setBatchRetrying(false); }
  }

  // ── Stop broadcast ──
  async function handleStop(broadcast: Broadcast) {
    if (cancelling || !selectedAccountId) return;
    setCancelling(broadcast.id);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      await api.stopBroadcast(broadcast.id);
      setSubmitNotice("발송이 중단되었습니다.");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "발송 중단에 실패했습니다.");
    } finally { setCancelling(null); }
  }

  // ── Pause / Unpause recurring ──
  async function handlePauseRecurring(broadcast: Broadcast) {
    if (!selectedAccountId) return;
    try { await api.pauseRecurringBroadcast(broadcast.id); await loadHistory(selectedAccountId); } catch { /* silent */ }
  }

  async function handleUnpauseRecurring(broadcast: Broadcast) {
    if (!selectedAccountId) return;
    try { await api.unpauseRecurringBroadcast(broadcast.id); await loadHistory(selectedAccountId); } catch { /* silent */ }
  }

  // ── Cancel confirm ──
  function handleCancelClick(b: Broadcast) {
    setCancelTarget(b);
    setCancelConfirmOpen(true);
  }

  // ── Account load on mount ──
  const mountGuardRef = useRef(true);
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
      const manager = RuntimeManager.getInstance();
      const cachedGroups = manager.getGroups(selectedAccountId);
      if (cachedGroups.length > 0) { setGroups(cachedGroups); setGroupsLoading(false); }
      else { runtimeActions.refreshGroups(selectedAccountId); }
      const cachedBroadcasts = manager.getBroadcasts(selectedAccountId);
      if (cachedBroadcasts.length > 0) { setHistory(cachedBroadcasts); setHistoryLoading(false); }
      else { runtimeActions.refreshBroadcasts(selectedAccountId); }
    } else { setGroups([]); setHistory([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => {
    const timer = setTimeout(() => { mountGuardRef.current = false; }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ── Cache sync ──
  useEffect(() => {
    if (cachedGroups.length > 0) { setGroups(cachedGroups); setGroupsLoading(false); }
  }, [cachedGroups]);
  useEffect(() => {
    if (cachedBroadcasts.length > 0) { setHistory(cachedBroadcasts); setHistoryLoading(false); }
  }, [cachedBroadcasts]);

  // ── Recipients ──
  const selectedRecipients = useMemo(
    () => normalizeSelectedRecipients(groups, selectedIds),
    [groups, selectedIds],
  );
  const selectedRecipientIds = useMemo(() => selectedRecipients.map((g) => g.id), [selectedRecipients]);

  // ── Estimate auto-fetch ──
  useEffect(() => {
    if (!selectedAccountId || selectedRecipientIds.length === 0 || !message.trim()) {
      setEstimatePreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setEstimateLoading(true);
      try {
        const est = await api.fetchBroadcastEstimate({
          accountId: selectedAccountId,
          recipientCount: selectedRecipientIds.length,
          deliveryMode: deliveryMode === "reply" ? "normal" : deliveryMode,
          delaySeconds: normalDelaySeconds,
        });
        setEstimatePreview(est);
      } catch { setEstimatePreview(null); }
      finally { setEstimateLoading(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedAccountId, selectedRecipientIds.length, message.trim(), deliveryMode, normalDelaySeconds]);

  // ── History stats ──
  const filteredHistory = useMemo(() => {
    let result = history;
    if (historyFilter !== "all") result = result.filter((h) => h.status === historyFilter);
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter((h) =>
        h.message.toLowerCase().includes(q) ||
        h.recipients.some((r) => r.toLowerCase().includes(q)) ||
        (h.errorMessage && h.errorMessage.toLowerCase().includes(q)));
    }
    if (historyDateFrom) result = result.filter((h) => (h.scheduledAt || h.createdAt) >= historyDateFrom);
    if (historyDateTo) result = result.filter((h) => (h.scheduledAt || h.createdAt) <= historyDateTo + "T23:59:59");
    return result;
  }, [history, historyFilter, historySearch, historyDateFrom, historyDateTo]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: history.length };
    for (const h of history) counts[h.status] = (counts[h.status] ?? 0) + 1;
    return counts;
  }, [history]);

  const groupedHistory = useMemo(() => {
    if (historyFilter !== "all") return null;
    const groups: { label: string; items: Broadcast[] }[] = [];
    const inFlight = history.filter((h) => h.status === "sending" || (h.status === "pending" && !h.scheduledAt));
    if (inFlight.length > 0) groups.push({ label: "진행 중", items: inFlight });
    const scheduled = history.filter((h) => h.status === "pending" && h.scheduledAt);
    if (scheduled.length > 0) groups.push({ label: "예약됨", items: scheduled });
    const todays = history.filter((h) => {
      if (h.status === "sending" || h.status === "pending") return false;
      const d = new Date(`${h.createdAt}Z`);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).slice(0, 5);
    if (todays.length > 0) groups.push({ label: "오늘 완료", items: todays });
    const older = history.filter((h) => {
      if (h.status === "sending" || h.status === "pending") return false;
      const d = new Date(`${h.createdAt}Z`);
      const today = new Date();
      return !(d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear());
    }).slice(0, 10);
    if (older.length > 0) groups.push({ label: "이전", items: older });
    return groups.length > 0 ? groups : null;
  }, [history, historyFilter]);

  // ── Auto-fetch estimate on mount ──
  // (already handled by the estimate effect above)

  // ── Recent sets ──
  const [recentSets, setRecentSets] = useState<string[][]>([]);
  useEffect(() => { setRecentSets(getRecentRecipientSets().slice(0, 3)); }, []);

  // ── Reuse broadcast ──
  const reuseBroadcast = useDashboardStore((s) => s.reuseBroadcast);
  const handleReuse = useCallback((b: Broadcast) => {
    reuseBroadcast(b);
    setInlineButtons(b.inlineButtons?.filter((btn) => btn.label && btn.url) ?? []);
    if (b.replyToMessageId != null) { setReplyMacroEnabled(true); setReplyToMessageId(String(b.replyToMessageId)); }
    else { setReplyMacroEnabled(false); setReplyToMessageId(""); }
  }, [reuseBroadcast]);

  const handleClone = useCallback((b: Broadcast) => {
    reuseBroadcast(b);
    setInlineButtons(b.inlineButtons?.filter((btn) => btn.label && btn.url) ?? []);
    if (b.replyToMessageId != null) { setReplyMacroEnabled(true); setReplyToMessageId(String(b.replyToMessageId)); }
    else { setReplyMacroEnabled(false); setReplyToMessageId(""); }
    toast("success", "발송이 복제되었습니다.");
  }, [reuseBroadcast, toast]);

  // ── Cancel dialog title / desc ──
  const cancelDialogTitle = cancelTarget && isRecurringBroadcast(cancelTarget) ? "반복 발송 취소" : "발송 중단";
  const cancelDialogDescription = cancelTarget
    ? isRecurringBroadcast(cancelTarget)
      ? `"${cancelTarget.message?.slice(0, 50)}"의 반복 발송을 취소할까요?`
      : `"${cancelTarget.message?.slice(0, 50)}" 발송을 중단할까요?`
    : "";

  // ── Status summary ──
  const statusSummary = useMemo(() => {
    const summary: { label: string; count: number; color: string; key: string }[] = [];
    const order: [Broadcast["status"], string, string][] = [
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

  // ── Search state (group search) ──
  const [search, setSearch] = useState("");

  // ── Mark initial mount complete ──
  useEffect(() => { isInitialMount.current = false; }, []);

  return {
    // State
    account, selectedAccountId, accounts, groups, groupsLoading, groupsError,
    selectedIds, selectedRecipients, selectedRecipientIds,
    message, setMessage, imageFile, setImageFile, imageObjectUrl, clearSendDraft,
    templates, setTemplates, templateSearch, setTemplateSearch,
    templateLibraryOpen, setTemplateLibraryOpen,
    saveTemplateDialogOpen, setSaveTemplateDialogOpen,
    saveTemplateName, setSaveTemplateName,
    refreshTemplates,
    isScheduled, setIsScheduled, scheduledAtLocal, setScheduledAtLocal,
    isRecurring, setIsRecurring, recurringInterval, setRecurringInterval,
    deliveryMode, setDeliveryMode, normalDelaySeconds, setNormalDelaySeconds,
    batchSize, setBatchSize,
    replyMacroEnabled, setReplyMacroEnabled, replyToMessageId, setReplyToMessageId,
    autoRetry, setAutoRetry, autoRetryCount, setAutoRetryCount, autoRetryInterval, setAutoRetryInterval,
    inlineButtons, setInlineButtons,
    submitting, setSubmitting, retrying, setRetrying,
    cancelling, setCancelling, cancelConfirmOpen, setCancelConfirmOpen,
    cancelTarget, setCancelTarget, submitError, setSubmitError, submitNotice, setSubmitNotice,
    estimatePreview, estimateLoading,
    batchRetrying, selectedHistoryIds, setSelectedHistoryIds,
    history, setHistory, historyLoading, historyRefreshing,
    historySearch, setHistorySearch, historyDateFrom, setHistoryDateFrom, historyDateTo, setHistoryDateTo,
    historyFilter, saveHistoryFilter, filteredHistory, statusCounts, groupedHistory,
    distributionBatchId, setDistributionBatchId, distributionSiblings, setDistributionSiblings,
    search, setSearch, recentSets, setRecentSets,
    cancelDialogTitle, cancelDialogDescription, statusSummary,
    // Handlers
    handleSubmit, handleRetry, handleBatchRetry,
    handleStop, handlePauseRecurring, handleUnpauseRecurring,
    handleCancelClick, handleManualRefresh, handleReuse, handleClone,
    loadHistory, loadDistributionStatus,
  };
}

// ── Standalone helpers (not exported) ──

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

function isRecurringBroadcast(b: Broadcast): boolean {
  return !!b.recurringIntervalMinutes;
}
