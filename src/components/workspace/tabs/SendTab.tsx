"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, Copy, Delete, Download, FileWarning, Eye,
  CalendarDays,  Hourglass, MessageSquare, Pause, Play, RefreshCw, RotateCcw, Search, SearchX, Users, X,
  Send as SendIcon, Users2, XCircle, MessageCircle, Megaphone, Filter,
  ExternalLink, Plus, Trash2, ArrowUp, ArrowDown, Upload, ChevronDown, ChevronUp,
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
import ApiKeyGuard from "@/components/ApiKeyGuard";
import { useApiKeyGuard } from "@/lib/useApiKeyGuard";
import { useFavoriteGroups, useGroupTags, useRecentGroups } from "@/lib/groupPreferences";
import * as api from "@/lib/api";
import * as folderApi from "@/lib/folderApi";
import { cn } from "@/lib/cn";
import {
  RECURRING_INTERVALS, NORMAL_DELAY_OPTIONS,
  isBroadcastInFlight, isRecurringActive, isRecurringBroadcast,
  type Broadcast, type BroadcastStatus, type Group, type GroupType, type GroupFolder,
  type DistributionSibling,
} from "@/types";
import { useDraftRestore, useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import { saveSendDraft, loadSendDraft, clearSendDraft as clearPersistedDraft } from "@/lib/sendDraft";
import { useToast } from "@/components/ui/Toast";
import {
  loadTemplates, saveTemplate as persistTemplate,
  deleteTemplate as removeTemplate,
  toggleTemplateFavorite,
  TEMPLATE_VARIABLES,
  previewTemplate,
  type MessageTemplate,
} from "@/lib/messageTemplates";
import { MessagePreview } from "@/components/workspace/tabs/send/MessagePreview";
import { HistoryRow } from "@/components/workspace/tabs/send/HistoryRow";
import { InlineButtonBuilder } from "@/components/workspace/tabs/send/InlineButtonBuilder";
import { RecipientReviewPanel } from "@/components/workspace/tabs/send/RecipientReviewPanel";
import { ScheduleCalendar } from "@/components/workspace/ScheduleCalendar";
import { STATUS_META } from "@/lib/statusMeta";
import { Modal } from "@/components/ui/Modal";
import { downloadLogsCsv } from "@/lib/exportCsv";
import { useRouter } from "next/navigation";
import { analyzeSendRisk, riskLevelColor, riskLevelBg, riskLevelLabel } from "@/lib/riskAnalysis";
import { computeSpamScore, type SpamScoreResult } from "@/lib/spamScore";
import { analyzeTone, toneLabel, toneColor, toneBg, type ToneAnalysis } from "@/lib/toneAnalyzer";
import { computeViralScore, viralColor, viralBg, viralLabel, type ViralScoreResult } from "@/lib/viralScore";



const POLL_INTERVAL_MS = 3000;
const HISTORY_POLL_INTERVAL_MS = 30000;
type SortMode = "default" | "members" | "favorites";
type HistoryFilter = BroadcastStatus | "all" | "recurring";
type DeliveryPreset = "safe" | "balanced" | "fast";

// 답장매크로 "중복 제거" — 계정+답장 대상 메시지 ID 조합으로 이미 답장한 수신자를 브라우저에 기억해뒀다가 다음 발송에서 제외한다.
function replyDedupeKey(accountId: string, replyToMessageId: string) {
  return `telemon-reply-dedupe:${accountId}:${replyToMessageId}`;
}
function loadReplyDedupeSet(accountId: string, replyToMessageId: string): Set<string> {
  try {
    const raw = localStorage.getItem(replyDedupeKey(accountId, replyToMessageId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function addToReplyDedupeSet(accountId: string, replyToMessageId: string, recipientIds: string[]) {
  try {
    const key = replyDedupeKey(accountId, replyToMessageId);
    const existing = loadReplyDedupeSet(accountId, replyToMessageId);
    recipientIds.forEach((id) => existing.add(id));
    localStorage.setItem(key, JSON.stringify([...existing]));
  } catch { /* ignore */ }
}
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Mirrors GroupTab's type taxonomy so a group/channel filters identically in both places.
const TYPE_LABEL: Record<GroupType, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};
const TYPE_ICON: Record<GroupType, typeof Users> = {
  group: Users,
  megagroup: Users2,
  channel: Megaphone,
};

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
const DELIVERY_PRESET_LABEL: Record<DeliveryPreset, string> = {
  safe: "안전 우선",
  balanced: "균형",
  fast: "속도 우선",
};





export function SendTab() {
  const { hasApiKey, onKeySet } = useApiKeyGuard();
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
  const plan = useDashboardStore((s) => s.plan);
  const imageObjectUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);
  useEffect(() => {
    return () => { if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl); };
  }, [imageObjectUrl]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
    setDragError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setDragError("지원하지 않는 파일 형식입니다. JPEG, PNG, WebP, GIF만 가능합니다.");
      return;
    }
    setDragError(null);
    setImageFile(file);
  }, [setImageFile]);

  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);

  useDraftRestore();
  const { clearDraft } = useAutoSaveDraft();

  const { isFavorite, toggleFavorite } = useFavoriteGroups();
  const { recent, markUsed } = useRecentGroups();
  const { tagsByGroup, addTag } = useGroupTags();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  
  // 모바일에서 전체 대화방 섹션 기본 접힘 상태
  const [allGroupsExpanded, setAllGroupsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768; // md breakpoint
  });

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
    if (!savedGroupStorageKey) return;
    // groups가 아직 로드되지 않았으면(savedSendGroupIds와 groups를 매칭할 수 없으면)
    // savedSendGroupIds를 그대로 유지하고 groups 로드를 기다림
    if (!groups.length) return;
    setSavedSendGroupIds((prev) => {
      if (prev.length === 0) return prev;
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

  // ── Send Groups (folders from the Groups page) ──
  const [sendFolders, setSendFolders] = useState<GroupFolder[]>([]);
  const [telegramFolders, setTelegramFolders] = useState<{ id: string; title: string; groupIds: string[] }[]>([]);

  useEffect(() => {
    if (!selectedAccountId) { setSendFolders([]); setTelegramFolders([]); return; }
    let cancelled = false;
    folderApi.fetchFolders(selectedAccountId)
      .then((f) => { if (!cancelled) setSendFolders(f); })
      .catch(() => { if (!cancelled) setSendFolders([]); });
    api.fetchGroupFolders(selectedAccountId).then((f) => { if (!cancelled) setTelegramFolders(f); });
    return () => { cancelled = true; };
  }, [selectedAccountId]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const tags of Object.values(tagsByGroup)) {
      for (const tag of tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }, [tagsByGroup]);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [typeFilter, setTypeFilter] = useState<GroupType | "all" | "saved">("all");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(60);
  const [deliveryMode, setDeliveryMode] = useState<"normal" | "bulk" | "replyMacro">("normal");
  const [normalDelaySeconds, setNormalDelaySeconds] = useState<number>(60);
  const [dragOver, setDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [replyMacroEnabled, setReplyMacroEnabled] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState("");
  const [dedupeReply, setDedupeReply] = useState(false);
  const [replyMacroActive, setReplyMacroActive] = useState(false);
  const [replyMacroMessage, setReplyMacroMessage] = useState("");
  const [replyMacroLoading, setReplyMacroLoading] = useState(false);
  const [replyMacroSaving, setReplyMacroSaving] = useState(false);
  const [autoRetry, setAutoRetry] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(3);
  const [autoRetryInterval, setAutoRetryInterval] = useState(5);
    const [deliveryPreset, setDeliveryPreset] = useState<DeliveryPreset>("balanced");
  const [inlineButtons, setInlineButtons] = useState<{ label: string; url: string }[]>([]);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
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
  const [estimatePreview, setEstimatePreview] = useState<{ estimated_seconds: number; estimated_minutes: number; readable: string } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

  const [batchRetrying, setBatchRetrying] = useState(false);
  const reuseBroadcast = useDashboardStore((s) => s.reuseBroadcast);
  const reuseNotice = useDashboardStore((s) => s.reuseNotice);
  const setReuseNotice = useDashboardStore((s) => s.setReuseNotice);

  const handleReuse = useCallback((b: Broadcast) => {
    reuseBroadcast(b);
    setInlineButtons(b.inlineButtons?.filter((btn) => btn.label && btn.url) ?? []);
    setDedupeReply(false);
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

  // 계정별 분산 발송 현황 — 발송이 여러 계정으로 쪼개졌을 때만 채워짐 (distributionBatchId 있는 경우)
  const [distributionBatchId, setDistributionBatchId] = useState<string | null>(null);
  const [distributionSiblings, setDistributionSiblings] = useState<DistributionSibling[]>([]);
  const distributionPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Persist filter to localStorage on change
  const saveHistoryFilter = useCallback((f: HistoryFilter) => {
    setHistoryFilter(f);
    try { localStorage.setItem(HISTORY_FILTER_KEY, f); } catch { /* ignore */ }
  }, []);
  const [bgPollTick, setBgPollTick] = useState(0);

  // ── URL search params sync for history filter ──
  const router = useRouter();
  const urlSyncedRef = useRef(false);

  // On mount, read URL params and apply (overrides localStorage)
  useEffect(() => {
    if (urlSyncedRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const filterParam = sp.get("filter");
    const qParam = sp.get("q");
    const fromParam = sp.get("from");
    const toParam = sp.get("to");
    if (filterParam && FILTER_ORDER.includes(filterParam as HistoryFilter)) {
      setHistoryFilter(filterParam as HistoryFilter);
      try { localStorage.setItem(HISTORY_FILTER_KEY, filterParam); } catch {}
    }
    if (qParam) setHistorySearch(qParam);
    if (fromParam) setHistoryDateFrom(fromParam);
    if (toParam) setHistoryDateTo(toParam);
    urlSyncedRef.current = true;
  }, []);

  // When filter/search/date changes, update URL params
  useEffect(() => {
    if (!urlSyncedRef.current) return;
    const params = new URLSearchParams();
    if (historyFilter !== "all") params.set("filter", historyFilter);
    if (historySearch.trim()) params.set("q", historySearch.trim());
    if (historyDateFrom) params.set("from", historyDateFrom);
    if (historyDateTo) params.set("to", historyDateTo);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [historyFilter, historySearch, historyDateFrom, historyDateTo, router]);

  const selectedRecipients = useMemo(
    () => normalizeSelectedRecipients(groups, selectedIds),
    [groups, selectedIds],
  );

  function normalizeSelectedRecipients(groups: Group[], selectedIds: string[]): Group[] {
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const next: Group[] = [];
    for (const id of selectedIds) {
      const group = groupById.get(id);
      if (!group) continue;
      next.push(group);
    }
    return next;
  }
  const selectedRecipientIds = useMemo(() => selectedRecipients.map((g) => g.id), [selectedRecipients]);

  // Auto-fetch send time estimate when message or recipients change
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
          deliveryMode: deliveryMode === "replyMacro" ? "normal" : deliveryMode,
          delaySeconds: normalDelaySeconds,
        });
        setEstimatePreview(est);
      } catch { setEstimatePreview(null); }
      finally { setEstimateLoading(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedAccountId, selectedRecipientIds.length, message.trim(), deliveryMode, normalDelaySeconds]);

  const { toast } = useToast();

  const handleClone = useCallback((b: Broadcast) => {
    reuseBroadcast(b);
    setInlineButtons(b.inlineButtons?.filter((btn) => btn.label && btn.url) ?? []);
    if (b.replyToMessageId != null) {
      setReplyMacroEnabled(true);
      setReplyToMessageId(String(b.replyToMessageId));
    } else {
      setReplyMacroEnabled(false);
      setReplyToMessageId("");
    }
    toast("success", "발송이 복제되었습니다. 메시지와 대상을 확인 후 발송하세요.");
  }, [reuseBroadcast, toast]);

  const draftRestoredRef = useRef(false);
  const isInitialMount = useRef(true);
  const mountGuardRef = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [bgPollTick, selectedAccountId, loadHistory]);

  async function loadDistributionStatus(batchId: string) {
    try {
      const siblings = await api.fetchDistributionStatus(batchId);
      setDistributionSiblings(siblings);
    } catch { /* silent — keep showing the last known state */ }
  }

  // 분산 발송의 계정별 진행 상태를 실시간 폴링 (하나라도 in-flight면 계속)
  useEffect(() => {
    if (distributionPollTimer.current) { clearTimeout(distributionPollTimer.current); distributionPollTimer.current = null; }
    if (!distributionBatchId || !distributionSiblings.some((s) => isBroadcastInFlight(s.broadcast))) return;
    distributionPollTimer.current = setTimeout(() => { loadDistributionStatus(distributionBatchId); }, POLL_INTERVAL_MS);
    return () => { if (distributionPollTimer.current) clearTimeout(distributionPollTimer.current); };
  }, [distributionBatchId, distributionSiblings]);

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
      setReplyMacroEnabled(false); setReplyToMessageId(""); setDedupeReply(false);
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

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: groups.length, saved: savedSendGroupIds.length };
    for (const g of groups) counts[g.type] = (counts[g.type] ?? 0) + 1;
    return counts;
  }, [groups, savedSendGroupIds]);

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    let filtered = query
      ? groups.filter((g) => g.title.toLowerCase().includes(query) || g.id.toLowerCase().includes(query))
      : groups;
    if (typeFilter === "saved") {
      filtered = filtered.filter((g) => savedSendGroupIds.includes(g.id));
    } else if (typeFilter !== "all") {
      filtered = filtered.filter((g) => g.type === typeFilter);
    }
    const sorted = [...filtered];
    if (sortMode === "members") sorted.sort((a, b) => (b.participantsCount ?? 0) - (a.participantsCount ?? 0));
    else if (sortMode === "favorites") sorted.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
    return sorted;
  }, [groups, search, sortMode, isFavorite, typeFilter, savedSendGroupIds]);

  // visibleGroups에 태그 필터 적용
  const filteredByTag = useMemo(() => {
    if (!tagFilter) return visibleGroups;
    return visibleGroups.filter((g) => (tagsByGroup[g.id] ?? []).includes(tagFilter));
  }, [visibleGroups, tagFilter, tagsByGroup]);

  /** History summary stats when not filtered by "all" */
  const filteredHistory = useMemo(() => {
    let result = history;
    if (historyFilter !== "all") {
      result = result.filter((h) => h.status === historyFilter);
    }
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter((h) =>
        h.message.toLowerCase().includes(q) ||
        h.recipients.some((r) => r.toLowerCase().includes(q)) ||
        (h.errorMessage && h.errorMessage.toLowerCase().includes(q))
      );
    }
    if (historyDateFrom) {
      result = result.filter((h) => (h.scheduledAt || h.createdAt) >= historyDateFrom);
    }
    if (historyDateTo) {
      result = result.filter((h) => (h.scheduledAt || h.createdAt) <= historyDateTo + "T23:59:59");
    }
    return result;
  }, [history, historyFilter, historySearch, historyDateFrom, historyDateTo]);

  const statusCounts = useMemo((): Record<string, number> => {
    const counts: Record<string, number> = { all: history.length };
    for (const h of history) counts[h.status] = (counts[h.status] ?? 0) + 1;
    return counts;
  }, [history]);

  /** Chronologically grouped history for the "all" view */
  const groupedHistory = useMemo(() => {
    if (historyFilter !== "all") return null;
    const groups: { label: string; items: Broadcast[] }[] = [];

    // 1. 진행 중 — sending/pending (scheduled 제외)
    const inFlight = history.filter((h) => h.status === "sending" || (h.status === "pending" && !h.scheduledAt));
    if (inFlight.length > 0) groups.push({ label: "진행 중", items: inFlight });

    // 2. 예약됨 — pending + scheduledAt
    const scheduled = history.filter((h) => h.status === "pending" && h.scheduledAt);
    if (scheduled.length > 0) groups.push({ label: "예약됨", items: scheduled });

    // 3. 오늘 완료 — 최근 5건만 (나머지는 필터로 조회)
    const todays = history.filter((h) => {
      if (h.status === "sending" || h.status === "pending") return false;
      const d = new Date(`${h.createdAt}Z`);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).slice(0, 5);
    if (todays.length > 0) groups.push({ label: "오늘 완료", items: todays });

    // 4. 이전 — 최근 10건만 (나머지는 필터로 조회)
    const older = history.filter((h) => {
      if (h.status === "sending" || h.status === "pending") return false;
      const d = new Date(`${h.createdAt}Z`);
      const today = new Date();
      return !(d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear());
    }).slice(0, 10);
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

  // Selecting a folder (Send Group) adds every group in it to the current manual
  // selection — same additive pattern as handleSelectSavedSendGroup/handleSelectAllVisible,
  // so manual checkbox selection keeps working unchanged before and after.
  function handleSelectFolder(folder: GroupFolder | { id: string; title: string; groupIds: string[] }) {
    const folderName = "name" in folder ? folder.name : folder.title;
    const folderGroupIds = "group_ids" in folder ? folder.group_ids : folder.groupIds;
    const availableGroupIds = new Set(groups.map((g) => g.id));
    const valid = folderGroupIds.filter((id) => availableGroupIds.has(id));
    if (valid.length === 0) {
      toast("error", "이 폴더에는 현재 계정에서 사용할 수 있는 그룹이 없습니다.");
      return;
    }
    const next = [...selectedIds, ...valid];
    setSendSelectedGroupIds(next);
    toast("success", `"${folderName}" 폴더에서 ${valid.length}개 그룹을 선택했습니다.`);
    }
    function applyDeliveryPreset(preset: DeliveryPreset) {
      setDeliveryPreset(preset);
      if (preset === "safe") {
        setDeliveryMode("normal");
        setNormalDelaySeconds(60);
        setBatchSize(1);
        setAutoRetry(true);
        setAutoRetryCount(3);
        setAutoRetryInterval(5);
        return;
      }
      if (preset === "balanced") {
        setDeliveryMode("normal");
        setNormalDelaySeconds(20);
        setBatchSize(5);
        setAutoRetry(true);
        setAutoRetryCount(2);
        setAutoRetryInterval(3);
        return;
      }
      setDeliveryMode("bulk");
      setNormalDelaySeconds(3);
      setBatchSize(10);
      setAutoRetry(false);
    }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || selectedRecipientIds.length === 0 || submitting) return;
    if (!message.trim()) {
      setSubmitError("메시지 내용을 입력하세요.");
      return;
    }
    if (isScheduled && !scheduledAtLocal) return;
    if (isRecurring && !recurringInterval) return;

    // 답장매크로 + 중복 제거: 이미 이 메시지에 답장한 대상을 제외하고 남은 대상 중 랜덤 순서로 발송
    let effectiveRecipients = selectedRecipientIds;
    if (replyMacroEnabled && dedupeReply && replyToMessageId.trim()) {
      const alreadyReplied = loadReplyDedupeSet(selectedAccountId ?? "", replyToMessageId.trim());
      const remaining = selectedRecipientIds.filter((id) => !alreadyReplied.has(id));
      if (remaining.length === 0) {
        setSubmitError("선택한 대상은 이미 모두 이 메시지에 답장을 받았습니다. 다른 대상을 선택하거나 중복 제거를 꺼주세요.");
        return;
      }
      effectiveRecipients = shuffled(remaining);
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const scheduledAtIso = isScheduled && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : undefined;
      // 답장 모드가 활성화되면 delivery_mode를 "replyMacro"로 설정
      const effectiveDeliveryMode = replyMacroEnabled && replyToMessageId.trim() ? "replyMacro" : deliveryMode;
      // Use send-to-group API when sending to groups (no manual recipients)
      const created = await api.createBroadcast({
        accountId: selectedAccountId,
        message: message.trim(),
        recipients: effectiveRecipients,
        autoRetry: autoRetry ? { maxRetries: autoRetryCount, intervalMinutes: autoRetryInterval } : undefined,
        image: imageFile ?? undefined,
        scheduledAt: scheduledAtIso,
        recurringIntervalMinutes: isRecurring ? recurringInterval : undefined,
        deliveryMode: effectiveDeliveryMode,
        delaySeconds: effectiveDeliveryMode === "normal" ? normalDelaySeconds : undefined,
        batchSize: effectiveDeliveryMode === "normal" ? batchSize : undefined,
        replyToMessageId: replyMacroEnabled && replyToMessageId.trim() ? Number(replyToMessageId.trim()) : undefined,
        inlineButtons: inlineButtons.filter((b) => b.label.trim() && b.url.trim()).length > 0
          ? inlineButtons.filter((b) => b.label.trim() && b.url.trim())
          : undefined,
      });
      api.clearIdempotencyKey();
      markUsed(selectedRecipientIds);
      addRecentRecipientSet(selectedRecipientIds);
      setRecentSets(getRecentRecipientSets().slice(0, 3));
      if (replyMacroEnabled && dedupeReply && replyToMessageId.trim() && selectedAccountId) {
        addToReplyDedupeSet(selectedAccountId, replyToMessageId.trim(), effectiveRecipients);
      }
      const modeLabel = deliveryMode === "replyMacro" ? "답장매크로 발송" : deliveryMode === "bulk" ? "전체 즉시 발송" : "발송";
      if (created.distributionBatchId) {
        setDistributionBatchId(created.distributionBatchId);
        void loadDistributionStatus(created.distributionBatchId);
        setSubmitNotice(`${modeLabel} 대상이 많아 여러 계정에 나눠서 보냅니다. 아래 "계정별 분산 발송 현황"에서 진행 상태를 확인하세요.`);
      } else {
        setDistributionBatchId(null);
        setDistributionSiblings([]);
        if (isRecurring) {
          const intervalLabel = RECURRING_INTERVALS.find((i) => i.value === recurringInterval)?.label ?? `${recurringInterval}분`;
          setSubmitNotice(`✅ 반복 설정 완료 (${intervalLabel} 간격)\n방금 첫 발송이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요.`);
        }
        else if (scheduledAtIso) setSubmitNotice(`${modeLabel}이 예약되었습니다. 아래 발송 이력에서 확인하세요.`);
        else setSubmitNotice(`${modeLabel} 작업이 시작되었습니다. 아래 발송 이력에서 진행 상태를 확인하세요.`);
      }

      clearSendDraft();
      clearPersistedDraft();
      clearDraft();
      setIsScheduled(false); setScheduledAtLocal("");
      setIsRecurring(false); setRecurringInterval(60);
      setDeliveryMode("normal"); setNormalDelaySeconds(60);
      setReplyMacroEnabled(false); setReplyToMessageId(""); setDedupeReply(false);
      setAutoRetry(false); setAutoRetryCount(3); setAutoRetryInterval(5);
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

  async function handleBatchRetry() {
    if (batchRetrying || selectedHistoryIds.size === 0) return;
    setBatchRetrying(true);
    try {
      const result = await api.batchRetryBroadcasts(Array.from(selectedHistoryIds));
      const successCount = result.results.filter((r) => r.status === "queued").length;
      setSubmitNotice(`${successCount}개 발송이 재시도 큐에 추가되었습니다.`);
      setSelectedHistoryIds(new Set());
      if (selectedAccountId) await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "일괄 재발송에 실패했습니다.");
    } finally { setBatchRetrying(false); }
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

  async function handlePauseRecurring(broadcast: Broadcast) {
    if (!selectedAccountId) return;
    try {
      await api.pauseRecurringBroadcast(broadcast.id);
      await loadHistory(selectedAccountId);
    } catch { /* silent */ }
  }

  async function handleUnpauseRecurring(broadcast: Broadcast) {
    if (!selectedAccountId) return;
    try {
      await api.unpauseRecurringBroadcast(broadcast.id);
      await loadHistory(selectedAccountId);
    } catch { /* silent */ }
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

  const riskAnalysis = useMemo(() => analyzeSendRisk(
    account ?? null,
    selectedRecipients,
    history,
    message,
  ), [account, selectedRecipients, history, message]);

  const successRatePrediction = useMemo(() => {
    const accountLogs = history.filter((l) => l.accountId === account?.id);
    const totalSent = accountLogs.length;
    const succeeded = accountLogs.filter((l) => l.status === "sent").length;
    const baseRate = totalSent > 0 ? (succeeded / totalSent) * 100 : 50;
    const msgLen = message.trim().length;
    const lengthFactor = msgLen === 0 ? 1 : msgLen <= 100 ? 1 : msgLen <= 500 ? 0.95 : msgLen <= 1000 ? 0.9 : msgLen <= 2000 ? 0.8 : 0.7;
    const recCount = selectedRecipientIds.length;
    const recipientFactor = recCount === 0 ? 1 : recCount <= 5 ? 0.98 : recCount <= 20 ? 0.95 : recCount <= 50 ? 0.9 : recCount <= 100 ? 0.85 : 0.75;
    const predicted = Math.round(baseRate * lengthFactor * recipientFactor);
    return Math.min(99, Math.max(1, predicted));
  }, [account, history, message, selectedRecipientIds]);

  const spamScore = useMemo(() => computeSpamScore(message), [message]);
  const tone = useMemo(() => analyzeTone(message), [message]);
  const viral = useMemo(() => computeViralScore(message), [message]);

  // 재시도로 살아날 가능성이 있는 실패 항목(네트워크/속도제한류)만 골라 일괄 선택할 수 있게 함
  const recoverableFailedIds = useMemo(
    () => history
      .filter((b) => b.status === "failed" && b.failureInfo?.retryable === "retryable")
      .map((b) => b.id),
    [history],
  );

  const bottleneckHints = riskAnalysis.recommendations;

  // ── 답장매크로 (랜덤리플라이) 토글 연동 ──
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  function authHeaders(): Record<string, string> {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  useEffect(() => {
    if (!selectedAccountId) return;
    setReplyMacroLoading(true);
    fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/toggle`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        setReplyMacroActive(!!data.is_active);
        setReplyMacroMessage(data.message_content || "");
      })
      .catch(() => {})
      .finally(() => setReplyMacroLoading(false));
  }, [selectedAccountId]);

  function handleSelectRecoverableFailures() {
    if (recoverableFailedIds.length === 0) {
      toast("info", "복구형 실패(네트워크/속도제한) 항목이 없습니다.");
      return;
    }
    setSelectedHistoryIds(new Set(recoverableFailedIds));
    toast("success", `${recoverableFailedIds.length}개 복구형 실패 항목을 선택했습니다.`);
  }

  async function saveReplyMacroToggle(nextActive: boolean) {
    if (!selectedAccountId || replyMacroSaving) return;
    setReplyMacroSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/toggle`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ is_active: nextActive, message_content: replyMacroMessage }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", data.detail || "저장 실패");
        return;
      }
      setReplyMacroActive(!!data.is_active);
      if (data.is_active) {
        toast("success", "랜덤 답장 켜짐 — 모든 그룹에 자동으로 나갑니다");
      } else {
        toast("success", "랜덤 답장 꺼짐");
      }
    } catch {
      toast("error", "네트워크 오류");
    } finally {
      setReplyMacroSaving(false);
    }
  }

  if (!account) {
    return (
      <Panel title="메시지 작성" description="발송을 시작하려면 계정을 선택하세요.">
        <EmptyState icon={Users2} title="선택된 계정이 없습니다" description="왼쪽 사이드바에서 계정을 선택한 후 메시지를 발송할 수 있습니다." />
      </Panel>
    );
  }

  const canSubmit = !submitting && selectedRecipientIds.length > 0 && message.trim().length > 0 && (!isScheduled || !!scheduledAtLocal) && (!isRecurring || !!recurringInterval);

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

              {/* Type filter chips — same taxonomy (그룹/슈퍼그룹/채널) and 발송그룹 as the 그룹 tab */}
              {!groupsLoading && groups.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setTypeFilter("all")}
                    className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1", typeFilter === "all" ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                    <Filter className="h-3 w-3" /> 전체 <span className="ml-0.5 opacity-70">{typeCounts.all ?? 0}</span>
                  </button>
                  {(["group", "megagroup", "channel"] as GroupType[]).map((t) => {
                    const count = typeCounts[t] ?? 0;
                    if (count === 0) return null;
                    const Icon = TYPE_ICON[t];
                    return (
                      <button key={t} type="button" onClick={() => setTypeFilter(t)}
                        className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1", typeFilter === t ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                        <Icon className="h-3 w-3" /> {TYPE_LABEL[t]} <span className="ml-0.5 opacity-70">{count}</span>
                      </button>
                    );
                  })}
                  {typeCounts.saved > 0 && (
                    <button type="button" onClick={() => setTypeFilter("saved")}
                      className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1", typeFilter === "saved" ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text")}>
                      <SendIcon className="h-3 w-3" /> 발송그룹 <span className="ml-0.5 opacity-70">{typeCounts.saved}</span>
                    </button>
                  )}
                </div>
              )}

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

              {!groupsLoading && (sendFolders.length > 0 || telegramFolders.length > 0) && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xs font-medium text-app-text-muted">그룹 폴더</span>
                    <span className="h-px flex-1 bg-app-border/50" />
                    <span className="text-[10px] text-app-text-subtle">{sendFolders.length + telegramFolders.length}개</span>
                  </div>
                  {sendFolders.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-app-text-muted">내 폴더</span>
                        <span className="text-[10px] text-app-text-subtle">{sendFolders.length}개</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sendFolders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => handleSelectFolder(folder)}
                            title={`"${folder.name}" 폴더의 그룹 ${folder.group_ids.length}개 선택`}
                            className="rounded-full bg-app-card-hover px-2.5 py-1 text-[11px] text-app-text-muted transition-colors hover:text-app-text"
                          >
                            📁 {folder.name} <span className="text-app-text-subtle">{folder.group_ids.length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {telegramFolders.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-app-text-muted">텔레그램 폴더</span>
                        <span className="text-[10px] text-app-text-subtle">{telegramFolders.length}개</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {telegramFolders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => handleSelectFolder(folder)}
                            title={`"${folder.title}" 폴더의 그룹 ${folder.groupIds.length}개 선택`}
                            className="rounded-full bg-app-card-hover px-2.5 py-1 text-[11px] text-app-text-muted transition-colors hover:text-app-text"
                          >
                            📂 {folder.title} <span className="text-app-text-subtle">{folder.groupIds.length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setAllGroupsExpanded(!allGroupsExpanded)}
                    className="mb-1.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-app-card-hover active:scale-[0.98]"
                  >
                    <span className="text-xs font-medium text-app-text-muted">전체 대화방</span>
                    <span className="h-px flex-1 bg-app-border/50" />
                    <span className="text-[10px] text-app-text-subtle">{visibleGroups.length}개</span>
                    {allGroupsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-app-text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-app-text-muted" />
                    )}
                  </button>

                  {allGroupsExpanded && (
                    <>
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
                        <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 md:max-h-96">
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
                    </>
                  )}
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

            {/* Variable quick-insert chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-app-text-muted">변수:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key)}
                  title={v.description}
                  className="rounded-md border border-app-border/60 bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-text-muted transition-colors hover:border-app-primary/40 hover:text-app-primary hover:bg-app-primary/5"
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <Field label="메시지 내용">
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="발송할 메시지를 입력하세요." required />
            </Field>

            {/* ── Message preview ( Telegram style ) ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <MessagePreview
                message={message}
                recipientCount={selectedRecipientIds.length}
                accountPhone={account?.phone}
                groupName={selectedRecipients[0]?.title}
                imagePreviewUrl={imageObjectUrl}
                plan={plan}
              />
              {message.trim() && TEMPLATE_VARIABLES.some((v) => message.includes(v.key)) && (
                <div className="rounded-xl border border-app-info/15 bg-app-info-muted/5 px-3 py-2 self-start">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-info mb-1">
                    <Eye className="h-3 w-3" />
                    변수 치환 정보
                  </div>
                  <div className="whitespace-pre-wrap break-words rounded-lg border border-app-border/50 bg-app-card/50 px-3 py-2 text-sm leading-relaxed text-app-text">
                  {previewTemplate(message, {
                    name: selectedRecipients[0]?.title ?? "샘플 그룹",
                    phone: account?.phone ?? "010-0000-0000",
                    count: selectedRecipientIds.length || 10,
                    date: new Date().toISOString().slice(0, 10),
                    time: new Date().toTimeString().slice(0, 5),
                    sender: account?.name || account?.phone || "[발신자]",
                    groupTitle: selectedRecipients[0]?.title ?? "샘플 그룹",
                  })}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-text-subtle">
                    {TEMPLATE_VARIABLES.filter((v) => message.includes(v.key)).map((v) => {
                      let sample = "";
                      if (v.key === "{{name}}") sample = selectedRecipients[0]?.title ?? "샘플 그룹";
                      else if (v.key === "{{phone}}") sample = account?.phone ?? "010-0000-0000";
                      else if (v.key === "{{count}}") sample = String(selectedRecipientIds.length || 10);
                      return (
                        <span key={v.key} className="inline-flex items-center gap-1">
                          <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[10px] text-app-info">{v.key}</code>
                          <span className="text-app-text-subtle">→</span>
                          <span className="font-medium text-app-text">{sample}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {message.trim().length > 0 && account && (
              <div className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-card/30 px-2.5 py-1 text-xs w-fit">
                <span className="text-app-text-muted">예상 성공률:</span>
                <span className={cn(
                  "font-semibold",
                  successRatePrediction >= 80 ? "text-app-success" : successRatePrediction >= 50 ? "text-app-warning" : "text-app-danger",
                )}>
                  {successRatePrediction}%
                </span>
              </div>
            )}

            {/* AI message insights */}
            {message.trim().length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {/* Spam Score */}
                <div className="rounded-lg border border-app-border bg-app-card p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-app-text-muted">AI 스팸 스코어</span>
                    <span className={cn(
                      "text-xs font-bold tabular-nums",
                      spamScore.score >= 70 ? "text-app-danger" : spamScore.score >= 40 ? "text-app-warning" : "text-app-success",
                    )}>
                      {spamScore.score}/100
                    </span>
                  </div>
                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        spamScore.score >= 70 ? "bg-app-danger" : spamScore.score >= 40 ? "bg-app-warning" : "bg-app-success",
                      )}
                      style={{ width: `${spamScore.score}%` }}
                    />
                  </div>
                  {spamScore.reasons.length > 0 && (
                    <ul className="space-y-0.5">
                      {spamScore.reasons.slice(0, 2).map((r, i) => (
                        <li key={i} className="text-[10px] text-app-text-subtle">• {r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Tone Analysis */}
                <div className="rounded-lg border border-app-border bg-app-card p-2.5">
                  <div className="mb-1 text-[10px] font-medium text-app-text-muted">메시지 톤 분석</div>
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    {tone.primaryTone && (
                      <span className={cn("inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold", toneBg(tone.primaryTone), toneColor(tone.primaryTone))}>
                        {toneLabel(tone.primaryTone)}
                      </span>
                    )}
                    {tone.secondaryTone && (
                      <span className="inline-block rounded-full bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-text-muted">
                        {toneLabel(tone.secondaryTone)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] leading-tight text-app-text-subtle">{tone.feedback}</p>
                </div>

                {/* Viral Score */}
                <div className="rounded-lg border border-app-border bg-app-card p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-app-text-muted">바이럴 스코어</span>
                    <span className={cn("text-xs font-bold tabular-nums", viralColor(viral.level))}>
                      {viralLabel(viral.level)}
                    </span>
                  </div>
                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
                    <div
                      className={cn("h-full rounded-full transition-all", viralBg(viral.level))}
                      style={{ width: `${viral.score}%` }}
                    />
                  </div>
                  {viral.recommendations.length > 0 && (
                    <p className="text-[10px] leading-tight text-app-text-subtle">{viral.recommendations[0]}</p>
                  )}
                </div>
              </div>
            )}

            {/* Template library toolbar */}
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



            <InlineButtonBuilder buttons={inlineButtons} onChange={setInlineButtons} />

            {/* Image / Video — Drag & Drop */}
            <Field label="이미지 또는 영상 (선택)">
              <div
                className={cn(
                  "relative rounded-xl border-2 border-dashed transition-colors cursor-pointer",
                  dragOver
                    ? "border-app-primary bg-app-primary/5"
                    : "border-app-border bg-app-card/30 hover:border-app-border-strong",
                  imageObjectUrl ? "p-2" : "p-4",
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                  onChange={(e) => {
                    setDragError(null);
                    setImageFile(e.target.files?.[0] ?? null);
                  }}
                  className="hidden"
                />
                {dragOver ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-app-primary">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">파일을 여기에 놓으세요</span>
                  </div>
                ) : imageObjectUrl ? (
                  <div className="relative">
                    <img
                      src={imageObjectUrl}
                      alt="첨부 이미지"
                      className="max-h-40 w-full rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                      }}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      title="이미지 제거"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="mt-1 text-center text-[11px] text-app-text-subtle">
                      클릭하거나 파일을 끌어다 놓아 교체
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 text-app-text-muted">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">파일을 끌어다 놓거나 클릭하여 선택</span>
                    <span className="text-[10px] text-app-text-subtle">JPEG, PNG, WebP, GIF, MP4, MOV, AVI, MKV</span>
                  </div>
                )}
                {dragError && (
                  <p className="mt-2 text-xs text-app-danger">{dragError}</p>
                )}
              </div>
            </Field>

            {/* Auto-retry on failure */}
            <div className="flex items-center gap-2 rounded-xl border border-app-border/60 bg-app-card/30 px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={autoRetry}
                  onChange={(e) => setAutoRetry(e.target.checked)}
                  className="rounded border-app-border text-app-primary focus-ring" />
                <span className="text-xs text-app-text">실패 시 자동 재시도</span>
              </label>
              {autoRetry && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] text-app-text-muted">최대</span>
                  <select value={autoRetryCount} onChange={(e) => setAutoRetryCount(Number(e.target.value))}
                    className="w-16 rounded border border-app-border bg-app-bg px-1 py-0.5 text-[10px] text-app-text outline-none focus-ring">
                    {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}회</option>)}
                  </select>
                  <span className="text-[10px] text-app-text-muted">간격</span>
                  <select value={autoRetryInterval} onChange={(e) => setAutoRetryInterval(Number(e.target.value))}
                    className="w-20 rounded border border-app-border bg-app-bg px-1 py-0.5 text-[10px] text-app-text outline-none focus-ring">
                    {[1, 3, 5, 10, 30, 60].map((m) => <option key={m} value={m}>{m}분</option>)}
                  </select>
                </div>
               )}
            </div>
            <div className="rounded-xl border border-app-border bg-app-card/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-app-text-muted">속도 프리셋</span>
                <div className="flex items-center gap-1.5">
                  {(["safe", "balanced", "fast"] as DeliveryPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyDeliveryPreset(preset)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        deliveryPreset === preset
                          ? "border-app-primary bg-app-primary text-white"
                          : "border-app-border bg-app-card text-app-text-muted hover:border-app-border-strong hover:text-app-text"
                      )}
                    >
                      {DELIVERY_PRESET_LABEL[preset]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timing & Delivery mode options */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-app-border bg-app-card/50 px-3 py-2.5">
                <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
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
                <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
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

            {/* Delivery Mode Selector */}
            <div className="rounded-xl border border-app-border bg-app-card/50 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-app-text">
                  <SendIcon className="h-3.5 w-3.5 text-app-text-muted" />
                  발송 방식
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2.5 rounded-lg border border-app-success/30 bg-app-success-muted/10 p-2.5 cursor-pointer hover:border-app-success/60 transition-colors">
                    <input type="radio" name="deliveryMode" value="normal" checked={deliveryMode === "normal"}
                      onChange={() => setDeliveryMode("normal")} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-app-text">일반 발송</div>
                        <Badge tone="success" className="text-[9px] px-1.5 py-0">권장</Badge>
                      </div>
                      {deliveryMode === "normal" ? (
                        <div className="mt-1.5 space-y-2">
                          <div className="flex items-center gap-2">
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
                          {/* Batch size selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-app-text-muted">묶음:</span>
                            {[1, 5, 10].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setBatchSize(size); }}
                                className={cn(
                                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                                  batchSize === size
                                    ? "border-app-primary bg-app-primary text-white"
                                    : "border-app-border bg-app-card text-app-text-muted hover:border-app-border-strong hover:text-app-text",
                                )}
                              >
                                {size}개씩
                                {size === 10 && <span className="ml-1 text-[9px] opacity-70">⚠️</span>}
                                {size === 1 && <span className="ml-1 text-[9px] opacity-70">✅</span>}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-text-subtle">
                            <span className={batchSize === 1 ? "text-app-success font-medium" : ""}>1개씩: 가장 안전</span>
                            <span className={batchSize === 5 ? "text-app-warning font-medium" : ""}>5개씩: 보통</span>
                            <span className={batchSize === 10 ? "text-app-danger font-medium" : ""}>10개씩: 위험 ⚠️</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-app-text-muted mt-1.5">간격과 묶음 개수를 선택하세요</div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 rounded-lg border border-app-info/30 bg-app-info-muted/5 p-2.5 cursor-pointer hover:border-app-info/60 transition-colors">
                    <input type="radio" name="deliveryMode" value="replyMacro" checked={deliveryMode === "replyMacro"}
                      onChange={() => setDeliveryMode("replyMacro")} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-app-text">답장매크로</div>
                        <Badge tone="info" className="text-[9px] px-1.5 py-0">자동</Badge>
                      </div>
                      <div className="text-xs text-app-text-muted">랜덤리플라이 — 켜면 모든 그룹에서 무작위 대상에게 자동 답장</div>
                      {deliveryMode === "replyMacro" && (
                        <div className="mt-2 rounded-lg border border-app-border/60 bg-app-card/60 p-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium text-app-text">{replyMacroActive ? "켜짐 — 자동 실행 중" : "꺼짐"}</div>
                              {replyMacroActive && <div className="text-[10px] text-app-text-subtle mt-0.5">이 계정의 모든 그룹에 자동 답장이 활성화됩니다</div>}
                            </div>
                            <Button
                              type="button"
                              variant={replyMacroActive ? "secondary" : "primary"}
                              size="sm"
                              loading={replyMacroSaving}
                              disabled={replyMacroSaving || (!replyMacroActive && !replyMacroMessage.trim())}
                              onClick={(e) => { e.stopPropagation(); saveReplyMacroToggle(!replyMacroActive); }}
                            >
                              {replyMacroActive ? "끄기" : "켜기"}
                            </Button>
                          </div>
                          <textarea
                            value={replyMacroMessage}
                            onChange={(e) => setReplyMacroMessage(e.target.value)}
                            placeholder="답장으로 보낼 메시지를 입력하세요"
                            rows={3}
                            disabled={replyMacroSaving}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none"
                          />
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              id="dedupeReplyMacro"
                              checked={dedupeReply}
                              onChange={(e) => setDedupeReply(e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5 rounded border-app-border"
                            />
                            <label htmlFor="dedupeReplyMacro" className="text-[10px] text-app-text-muted cursor-pointer select-none">중복 수신자 제외</label>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 rounded-lg border border-app-danger/30 bg-app-danger-muted/20 p-2.5 cursor-pointer hover:border-app-danger/60 transition-colors">
                    <input type="radio" name="deliveryMode" value="bulk" checked={deliveryMode === "bulk"}
                      onChange={() => setDeliveryMode("bulk")} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-app-text">전체 즉시 발송</div>
                        <Badge tone="danger" className="text-[9px] px-1.5 py-0">위험</Badge>
                      </div>
                      <div className="text-xs text-app-text-muted">한 번에 모든 방에 전송합니다. Telegram 제한에 걸릴 위험이 있습니다.</div>
                    </div>
                  </label>
              </div>
            </div>

            {/* 발송 간격 슬라이더는 전체 즉시 발송 모드일 때만 표시 */}
            {deliveryMode === "bulk" && (
              <div className="rounded-xl border border-app-border bg-app-card/50 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-app-text">
                  <Hourglass className="h-3.5 w-3.5 text-app-text-muted" />
                  발송 간격
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={normalDelaySeconds}
                    onChange={(e) => setNormalDelaySeconds(Number(e.target.value))}
                    className="flex-1 accent-app-primary cursor-pointer"
                  />
                  <span className="w-12 text-right text-sm font-medium text-app-text tabular-nums">
                    {normalDelaySeconds}초
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-app-text-subtle">
                  <span>1초</span>
                  <span>60초</span>
                </div>
              </div>
            )}

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

      {/* ── Distribution Status Panel ── 대상 그룹이 많아 여러 계정에 나눠 보낸 경우에만 표시 */}
      {distributionBatchId && distributionSiblings.length > 0 && (
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-app-primary" />
              계정별 분산 발송 현황
            </div>
          }
          description={`대상이 많아 계정 ${distributionSiblings.length}개에 나눠서 보냈습니다`}
          action={
            <>
              {recoverableFailedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectRecoverableFailures}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-warning hover:bg-app-warning-muted transition-colors"
                >
                  <FileWarning className="h-3.5 w-3.5" />
                  복구형 실패 선택 {recoverableFailedIds.length}개
                </button>
              )}
              <button
                onClick={() => loadDistributionStatus(distributionBatchId)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                새로고침
              </button>
            </>
          }
        >
          <div className="space-y-2">
            {distributionSiblings.map((sib) => {
              const meta = STATUS_META[sib.broadcast.status];
              const groupCount = sib.broadcast.recipients.length;
              return (
                <div
                  key={sib.broadcast.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-app-border/60 bg-app-bg/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-app-text truncate">
                      {sib.accountName || sib.accountPhone}
                    </div>
                    <div className="text-[11px] text-app-text-muted">{groupCount}개 그룹 배정</div>
                  </div>
                  <Badge tone={meta.tone} className="shrink-0 gap-1">
                    <meta.icon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Schedule Calendar ── */}
      <Panel title={<div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-app-primary" /> 발송 일정</div>}
        description="예약된 발송을 달력에서 확인하세요">
        <ScheduleCalendar broadcasts={history} onCancel={(b) => handleCancelClick(b)} />
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
          <div className="flex items-center gap-1.5">
            {selectedHistoryIds.size > 0 && (
              <button onClick={handleBatchRetry} disabled={batchRetrying}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-danger hover:bg-app-danger-muted transition-colors disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${batchRetrying ? "animate-spin" : ""}`} />
                {selectedHistoryIds.size}개 재발송
              </button>
            )}
            {history.length > 0 && (
              <button onClick={() => downloadLogsCsv(filteredHistory)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors">
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            )}
            <button onClick={handleManualRefresh} disabled={historyLoading || historyRefreshing}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${historyLoading || historyRefreshing ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        }
      >
        {/* History search & date filter */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
            <input type="text" value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="메시지/수신자/오류 검색"
              className="w-full rounded-lg border border-app-border bg-app-card py-1.5 pl-8 pr-2 text-xs text-app-text placeholder:text-app-text-subtle outline-none transition-colors focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
            />
          </div>
          <input type="date" value={historyDateFrom}
            onChange={(e) => setHistoryDateFrom(e.target.value)}
            className="w-36 rounded-lg border border-app-border bg-app-card px-2 py-1.5 text-xs text-app-text outline-none transition-colors focus:border-app-primary/60"
            title="시작 날짜"
          />
          <span className="text-[11px] text-app-text-subtle">~</span>
          <input type="date" value={historyDateTo}
            onChange={(e) => setHistoryDateTo(e.target.value)}
            className="w-36 rounded-lg border border-app-border bg-app-card px-2 py-1.5 text-xs text-app-text outline-none transition-colors focus:border-app-primary/60"
            title="종료 날짜"
          />
          {(historySearch || historyDateFrom || historyDateTo) && (
            <button type="button" onClick={() => { setHistorySearch(""); setHistoryDateFrom(""); setHistoryDateTo(""); }}
              className="flex items-center gap-1 rounded-lg border border-app-border bg-app-card px-2 py-1.5 text-[11px] text-app-text-muted transition-colors hover:border-app-border-strong hover:text-app-text"
              title="필터 초기화"
            >
              <X className="h-3 w-3" /> 초기화
            </button>
          )}
        </div>
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
                onClone={handleClone}
                onAiAnalyze={(b) => {
                  useDashboardStore.getState().setActiveTab("myai");
                  setTimeout(() => {
                    const store = useDashboardStore.getState();
                    store.setSendMessage(`이 발송이 실패한 이유를 분석해줘:\n에러: ${b.errorMessage || "알 수 없음"}\n메시지: ${b.message}`);
                  }, 300);
                }}
                onToggleSelect={(id) => setSelectedHistoryIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
                selected={selectedHistoryIds.has(h.id)}
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
            onClone={handleClone}
            onPauseResume={(b) => b.isRecurringPaused ? handleUnpauseRecurring(b) : handlePauseRecurring(b)}
            onAiAnalyze={(b) => {
              useDashboardStore.getState().setActiveTab("myai");
              setTimeout(() => {
                const store = useDashboardStore.getState();
                store.setSendMessage(`이 발송이 실패한 이유를 분석해줘:\n에러: ${b.errorMessage || "알 수 없음"}\n메시지: ${b.message}`);
              }, 300);
            }}
            onToggleSelect={(id) => setSelectedHistoryIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
            selected={selectedHistoryIds.has(h.id)}
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

      {riskAnalysis.level !== "safe" && (
        <div className={cn(
          "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
          riskLevelBg(riskAnalysis.level),
          riskLevelColor(riskAnalysis.level),
          riskAnalysis.level === "caution" ? "border-app-warning/20" : "border-app-danger/20",
        )}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{riskLevelLabel(riskAnalysis.level)}: 발송 리스크 분석</p>
            {riskAnalysis.reasons.length > 0 && (
              <ul className="list-inside list-disc space-y-0.5 text-[11px] opacity-80">
                {riskAnalysis.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {riskAnalysis.recommendations.length > 0 && (
              <ul className="list-inside list-disc space-y-0.5 text-[11px] opacity-80">
                {riskAnalysis.recommendations.map((r, i) => <li key={i}>→ {r}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Send time estimate */}
      {estimatePreview && canSubmit && (
        <div className="flex items-center justify-end gap-2 text-xs text-app-text-muted mb-2">
          <Hourglass className="h-3.5 w-3.5" />
          <span>예상 소요 시간: <strong className="text-app-text">{estimatePreview.readable}</strong></span>
              {bottleneckHints.length > 0 && canSubmit && (
                <div className="mb-2 rounded-xl border border-app-warning/25 bg-app-warning-muted/20 px-3 py-2 text-[11px] text-app-warning">
                  <p className="mb-1 font-medium">속도/제한 진단</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {bottleneckHints.map((hint, idx) => <li key={idx}>{hint}</li>)}
                  </ul>
                </div>
              )}
        </div>
      )}
      {estimateLoading && !estimatePreview && canSubmit && (
        <div className="flex items-center justify-end gap-2 text-xs text-app-text-muted mb-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>예상 시간 계산 중...</span>
        </div>
      )}
      {message.trim().length > 0 && (
        <p className="text-right text-[10px] text-app-text-subtle -mb-1.5">임시 저장됨</p>
      )}
      {/* Floating submit button */}
      <motion.div
        initial={false}
        animate={canSubmit ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.5, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="sticky bottom-4 ml-auto flex w-fit"
      >
        <ApiKeyGuard
          description="발송 기능을 사용하려면 API 키가 필요합니다. 봇 메뉴에서 '🔑 내 API 키'를 통해 발급받으세요."
          hasApiKey={hasApiKey}
          onKeySet={onKeySet}
        >
          <Button type="submit" form="send-form" variant="primary"
            className="rounded-full px-5 py-3 text-sm shadow-lg shadow-app-primary/30" disabled={!canSubmit}>
            <SendIcon className="h-4 w-4" />
            {submitting ? "처리 중..." : isRecurring ? "반복 설정" : isScheduled ? "예약하기" : "발송"}
          </Button>
        </ApiKeyGuard>
      </motion.div>
    </div>
  );
}
