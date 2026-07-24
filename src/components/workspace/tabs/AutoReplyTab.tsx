"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareOff, Plus, X, Search, RotateCcw, Copy, ChevronDown, Hash, User, MessageSquare, AtSign, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { BottomSheetWrapper } from "@/components/ui/BottomSheetWrapper";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { RuntimeManager } from "@/lib/runtimeManager";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountCache } from "@/lib/useAccountCache";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AutoReplyLog, AutoReplyLogStatus, AutoReplyMatchType, AutoReplyRule } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { useHapticFeedback } from "@tma.js/sdk-react";
import { WatermarkGate } from "@/components/workspace/WatermarkGate";
import { useSwipeTemplate } from "@/hooks/useSwipeTemplate"; // ?§Ï??¥ÌîÑ ?úÌîåÎ¶???Ï∂îÍ?
import { QuickTemplateSelector } from "@/components/ui/QuickTemplateSelector"; // ???úÌîåÎ¶??†ÌÉùÍ∏?Ï∂îÍ?

const MATCH_TYPE_LABEL: Record<AutoReplyMatchType, string> = {
  keyword: "?§Ïõå???¨Ìï®",
  exact: "?ïÌôï???ºÏπò",
};

const MATCH_TYPE_DESC: Record<AutoReplyMatchType, string> = {
  keyword: "Î©îÏãúÏßÄ?????§Ïõå?úÍ? ?¨Ìï®?òÎ©¥ ?ëÎãµ",
  exact: "Î©îÏãúÏßÄÍ∞Ä ??Î¨∏Íµ¨?Ä ?ÑÏ†Ñ???ºÏπò?òÎ©¥ ?ëÎãµ",
};

const LOG_STATUS_TONE: Record<AutoReplyLogStatus, { tone: "success" | "warning" | "danger"; label: string }> = {
  success: { tone: "success", label: "?ëÎãµ ?ÑÎ£å" },
  failed: { tone: "danger", label: "?§Ìå®" },
  rate_limited: { tone: "warning", label: "?úÌïú?? },
};

import { formatDateTime } from "@/lib/formatTime";

function formatRuleDateTime(iso: string): string {
  const d = new Date(`${iso}Z`);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function getValidationErrors(name: string, matchValue: string, replyContent: string, cooldownHours: number, maxRepliesPerDay: number) {
  const errors: Partial<Record<"name" | "matchValue" | "replyContent" | "cooldownHours" | "maxRepliesPerDay", string>> = {};
  if (!name.trim()) errors.name = "Í∑úÏπô ?¥Î¶Ñ???ÖÎ†•?òÏÑ∏??;
  if (!matchValue.trim()) errors.matchValue = "?§Ïõå???êÎäî Î¨∏Íµ¨Î•??ÖÎ†•?òÏÑ∏??;
  if (matchValue.trim().length > 200) errors.matchValue = "200???¥ÌïòÎ°??ÖÎ†•?òÏÑ∏??;
  if (!replyContent.trim()) errors.replyContent = "?ëÎãµ ?¥Ïö©???ÖÎ†•?òÏÑ∏??;
  if (replyContent.trim().length > 4096) errors.replyContent = "Î©îÏãúÏßÄÍ∞Ä ?àÎ¨¥ ÍπÅÎãà??(ÏµúÎ? 4096??";
  if (cooldownHours < 0) errors.cooldownHours = "0 ?¥ÏÉÅ ?ÖÎ†•?òÏÑ∏??;
  if (maxRepliesPerDay < 1) errors.maxRepliesPerDay = "1 ?¥ÏÉÅ ?ÖÎ†•?òÏÑ∏??;
  return errors;
}

type FilterMode = "all" | "active" | "inactive";

export function AutoReplyTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const plan = useDashboardStore((s) => s.plan);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const [enabled, setEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AutoReplyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<AutoReplyMatchType>("keyword");
  const [matchValue, setMatchValue] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [cooldownHours, setCooldownHours] = useState(1);
  const [maxRepliesPerDay, setMaxRepliesPerDay] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ?Ä?Ä New features ?Ä?Ä
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);

  const { toast } = useToast();
  let haptics: ReturnType<typeof useHapticFeedback> | null = null;
  try {
    haptics = useHapticFeedback();
  } catch (e) { console.warn('Unhandled error in AutoReplyTab', e) }

  const [isMobile, setIsMobile] = useState(false);
  const [actionSheetRuleId, setActionSheetRuleId] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ?Ä?Ä RuntimeManager Ï∫êÏãú?êÏÑú AutoReply ?∞Ïù¥??Ï¶âÏãú Î°úÎìú ?Ä?Ä
  const { autoReply, autoReplyLogs } = useAccountCache(selectedAccountId);
  useEffect(() => {
    if (selectedAccountId) {
      const cache = autoReply;
      if (cache) {
        setEnabled(cache.autoReplyEnabled);
        setRules(cache.rules);
        setRulesLoading(false);
        setRulesError(null);
      } else {
        // Ï∫êÏãú ÎØ∏Ïä§ ??RuntimeManagerÎ•??µÌï¥ cache Í∞±Ïã† + notify
        setRulesLoading(true);
        RuntimeManager.getInstance().refreshAutoReply(selectedAccountId);
      }
      setLogs(autoReplyLogs);
      setLogsLoading(false);
    } else {
      setRules([]);
      setLogs([]);
      setEnabled(false);
    }
    setToggleError(null);
    setSubmitError(null);
    setActionError(null);
    setSearchQuery("");
    setFilterMode("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // Î∞±Í∑∏?ºÏö¥??Ï∫êÏãú ?ÖÎç∞?¥Ìä∏ ??Î°úÏª¨ ?ÅÌÉú ?ôÍ∏∞??  useEffect(() => {
    if (autoReply) {
      setEnabled(autoReply.autoReplyEnabled);
      setRules(autoReply.rules);
      setRulesLoading(false);
      setRulesError(null);
    }
  }, [autoReply]);

  useEffect(() => {
    if (autoReplyLogs.length > 0) {
      setLogs(autoReplyLogs);
      setLogsLoading(false);
    }
  }, [autoReplyLogs]);

  // ?Ä?Ä Filtered & searched rules ?Ä?Ä
  const filteredRules = useMemo(() => {
    let result = rules;
    // Filter by active/inactive
    if (filterMode === "active") result = result.filter((r) => r.isActive);
    else if (filterMode === "inactive") result = result.filter((r) => !r.isActive);
    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.matchValue.toLowerCase().includes(q) ||
          r.replyContent.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rules, filterMode, searchQuery]);

  async function handleToggleMaster(next: boolean) {
    if (!selectedAccountId || toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      const result = await api.toggleAutoReply(selectedAccountId, next);
      setEnabled(result);
      toast("success", next ? "?êÎèô ?ëÎãµ??ÏºúÏ°å?µÎãà?? : "?êÎèô ?ëÎãµ??Í∫ºÏ°å?µÎãà??);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "?§Ï†ï??Î≥ÄÍ≤ΩÌïòÏßÄ Î™ªÌñà?µÎãà??");
      toast("error", "?êÎèô ?ëÎãµ ?§Ï†ï Î≥ÄÍ≤ΩÏóê ?§Ìå®?àÏäµ?àÎã§");
    } finally {
      setToggling(false);
    }
  }

  async function handleToggleRule(rule: AutoReplyRule) {
    if (!selectedAccountId) return;
    setActionError(null);
    try {
      const updated = await api.updateAutoReplyRule(selectedAccountId, rule.id, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast("success", updated.isActive ? "Í∑úÏπô???úÏÑ±?îÎêò?àÏäµ?àÎã§" : "Í∑úÏπô??ÎπÑÌôú?±Ìôî?òÏóà?µÎãà??);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Í∑úÏπô???òÏ†ï?òÏ? Î™ªÌñà?µÎãà??");
      toast("error", "Í∑úÏπô ?ÅÌÉú Î≥ÄÍ≤ΩÏóê ?§Ìå®?àÏäµ?àÎã§");
    }
  }

  function openCreateForm() {
    setEditingRuleId(null);
    setName("");
    setMatchType("keyword");
    setMatchValue("");
    setReplyContent("");
    setCooldownHours(1);
    setMaxRepliesPerDay(100);
    setSubmitError(null);
    setValidationErrors({});
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openEditForm(rule: AutoReplyRule) {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setMatchType(rule.matchType);
    setMatchValue(rule.matchValue);
    setReplyContent(rule.replyContent);
    setCooldownHours(rule.cooldownHours);
    setMaxRepliesPerDay(rule.maxRepliesPerDay);
    setSubmitError(null);
    setValidationErrors({});
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openDuplicateForm(rule: AutoReplyRule) {
    setEditingRuleId(null);
    setName(rule.name + " (?¨Î≥∏)");
    setMatchType(rule.matchType);
    setMatchValue(rule.matchValue);
    setReplyContent(rule.replyContent);
    setCooldownHours(rule.cooldownHours);
    setMaxRepliesPerDay(rule.maxRepliesPerDay);
    setSubmitError(null);
    setValidationErrors({});
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingRuleId(null);
    setSubmitError(null);
    setValidationErrors({});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || submitting || submitLockRef.current) return;

    const errors = getValidationErrors(name, matchValue, replyContent, cooldownHours, maxRepliesPerDay);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingRuleId) {
        const updated = await api.updateAutoReplyRule(selectedAccountId, editingRuleId, {
          name: name.trim(),
          matchType,
          matchValue: matchValue.trim(),
          replyContent: replyContent.trim(),
          cooldownHours,
          maxRepliesPerDay,
        });
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast("success", "Í∑úÏπô???òÏ†ï?òÏóà?µÎãà??);
      } else {
        const rule = await api.createAutoReplyRule(selectedAccountId, {
          name: name.trim(),
          matchType,
          matchValue: matchValue.trim(),
          replyContent: replyContent.trim(),
          cooldownHours,
          maxRepliesPerDay,
        });
        setRules((prev) => [rule, ...prev]);
        toast("success", "Í∑úÏπô??Ï∂îÍ??òÏóà?µÎãà??);
      }
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Í∑úÏπô???Ä?•ÌïòÏßÄ Î™ªÌñà?µÎãà??");
      toast("error", "Í∑úÏπô ?Ä?•Ïóê ?§Ìå®?àÏäµ?àÎã§");
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  async function handleConfirmDelete() {
    if (!selectedAccountId || !confirmDeleteId) return;
    setActionError(null);
    try {
      await api.deleteAutoReplyRule(selectedAccountId, confirmDeleteId);
      setRules((prev) => prev.filter((r) => r.id !== confirmDeleteId));
      toast("success", "Í∑úÏπô????†ú?òÏóà?µÎãà??);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Í∑úÏπô????†ú?òÏ? Î™ªÌñà?µÎãà??");
      toast("error", "Í∑úÏπô ??†ú???§Ìå®?àÏäµ?àÎã§");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function handleCopyReply(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast("success", "?ëÎãµ ?¥Ïö©??Î≥µÏÇ¨?òÏóà?µÎãà??),
      () => toast("error", "?¥Î¶ΩÎ≥¥Îìú Î≥µÏÇ¨???§Ìå®?àÏäµ?àÎã§")
    );
  }

  if (!account) {
    return (
      <Panel title="?êÎèô ?ëÎãµ">
        <p className="text-sm text-app-text-muted">?¨Ïù¥?úÎ∞î?êÏÑú Í≥ÑÏ†ï???†ÌÉù?òÏÑ∏??/p>
      </Panel>
    );
  }

  // ?úÌîåÎ¶??ÅÌÉú Ï∂îÍ?
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Í∏∞Î≥∏ ?ëÎãµ', content: '?àÎÖï?òÏÑ∏?? ?ïÏù∏ ???µÎ??úÎ¶¨Í≤†Ïäµ?àÎã§.' },
    { id: '2', name: '?ÖÎ¨¥?úÍ∞Ñ ?àÎÇ¥', content: '?ÖÎ¨¥?úÍ∞Ñ?Ä ?âÏùº 09:00~18:00?ÖÎãà??' },
    { id: '3', name: '?¥Î¨¥???àÎÇ¥', content: 'Ï£ºÎßê Î∞?Í≥µÌú¥?ºÏ? ?¥Î¨¥?ÖÎãà??' },
  ]);

  // ÏµúÍ∑º Î©îÏãúÏßÄ ?ÅÌÉú Ï∂îÍ?
  const [recentMessages, setRecentMessages] = useState([
    '?àÎÖï?òÏÑ∏??,
    'Î¨∏Ïùò ?úÎ¶Ω?àÎã§',
    '?ïÏù∏ Î∂Ä?ÅÎìúÎ¶ΩÎãà??
  ]);

  // ?§Ï??¥ÌîÑ ?úÌîåÎ¶????¨Ïö©
  const {
    showTemplates,
    showRecent,
    attachSwipeListeners,
    hidePanels,
    onTemplateSelect,
    onRecentMessageSelect
  } = useSwipeTemplate({
    templates: templates.map(t => t.content),
    recentMessages,
    onTemplateSelect: (template: string) => {
      // ?úÌîåÎ¶øÏùÑ ?ÑÏû¨ ?ÖÎ†• ?ÑÎìú???ΩÏûÖ?òÎäî Î°úÏßÅ
    },
    onRecentMessageSelect: (message: string) => {
      // ÏµúÍ∑º Î©îÏãúÏßÄÎ•??ÑÏû¨ ?ÖÎ†• ?ÑÎìú???ΩÏûÖ?òÎäî Î°úÏßÅ
    }
  });

  // ???àÌçº?∞Ïä§???§Ï??¥ÌîÑ Î¶¨Ïä§???∞Í≤∞
  useEffect(() => {
    if (formRef.current) {
      const cleanup = attachSwipeListeners(formRef.current);
      return cleanup;
    }
  }, [attachSwipeListeners]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      {/* Master toggle */}
      <Panel title="?êÎèô ?ëÎãµ" description={`${account.name ?? account.phone} Í≥ÑÏ†ï???êÎèô ?ëÎãµ??ÏºúÍ±∞???ïÎãà??}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-app-text">
              {enabled ? "?êÎèô ?ëÎãµ ÏºúÏßê" : "?êÎèô ?ëÎãµ Í∫ºÏßê"}
            </span>
            <span className="text-xs text-app-text-muted">
              {account.status !== 'active' && !enabled
                ? "Í≥ÑÏ†ï ?∏Ï¶ù???ÑÎ£å?òÏ? ?äÏïò?µÎãà?? Î®ºÏ? Í≥ÑÏ†ï ?±Î°ù?êÏÑú Telegram ?∏Ï¶ù???ÑÎ£å?¥Ï£º?∏Ïöî"
                : enabled 
                  ? "?±Î°ù??Í∑úÏπô??Î©îÏãúÏßÄ???êÎèô?ºÎ°ú ?ëÎãµ?òÍ≥† ?àÏäµ?àÎã§" 
                  : "?±Î°ù??Í∑úÏπô??Î©îÏãúÏßÄ???êÎèô?ºÎ°ú ?ëÎãµ?òÏ? ?äÏäµ?àÎã§"}
            </span>
          </div>
          <div className="relative" title={account.status !== 'active' && !enabled ? 'Î®ºÏ? Í≥ÑÏ†ï ?∏Ï¶ù???ÑÎ£å?¥Ï£º?∏Ïöî' : ''}>
            <Button
              variant={enabled ? "outline-destructive" as any : "outline-success" as any}
              size="sm"
              onClick={() => handleToggleMaster(!enabled)}
              disabled={toggling || (account.status !== "active" && !enabled)}
              className="whitespace-nowrap"
            >
              {toggling ? (
                <span>Ï≤òÎ¶¨Ï§?..</span>
              ) : enabled ? (
                <span>?ÑÍ∏∞</span>
              ) : (
                <span>ÏºúÍ∏∞</span>
              )}
            </Button>
          </div>
        </div>
        {toggleError && (
          <div className="mt-2 rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{toggleError}</div>
        )}
      </Panel>

      {/* ???úÌîåÎ¶??†ÌÉùÍ∏?Ï∂îÍ? */}
      <div className="px-4">
        <QuickTemplateSelector 
          templates={templates}
          onTemplateSelect={(template) => {
            // ?†ÌÉù???úÌîåÎ¶øÏùÑ ?ÑÏû¨ ?ÖÎ†• ?ÑÎìú???ΩÏûÖ
          }}
          onAddTemplate={(name, content) => {
            // ???úÌîåÎ¶?Ï∂îÍ?
            const newTemplate = {
              id: Date.now().toString(),
              name,
              content,
              createdAt: new Date().toISOString()
            };
            setTemplates(prev => [newTemplate, ...prev]);
          }}
        />
      </div>

      {/* Watermark + Referral Gate ??free plan users must enable watermark */}
      <WatermarkGate plan={plan} />

      {/* Rules list */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-app-text">
            Í∑úÏπô {!rulesLoading && `(${filteredRules.length}/${rules.length})`}
          </h3>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={openCreateForm} className="shrink-0">
              <Plus className="h-3.5 w-3.5" /> ??Í∑úÏπô
            </Button>
          )}
        </div>

        {/* Search & filter */}
        {!rulesLoading && rules.length > 0 && (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Í∑úÏπô ?¥Î¶Ñ / ?§Ïõå??/ ?ëÎãµ Í≤Ä??
                className="w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-app-text-muted hover:text-app-text transition-colors"
                  aria-label="Í≤Ä??Ï¥àÍ∏∞??
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterMode(f)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[32px]",
                    filterMode === f
                      ? "bg-app-primary text-white"
                      : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                  )}
                >
                  {f === "all" ? "?ÑÏ≤¥" : f === "active" ? "?¨Ïö© Ï§? : "Ï§ëÏ???}
                </button>
              ))}
            </div>
          </div>
        )}

        {rulesLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {rulesError && (
          <div className="mb-3 rounded-lg bg-app-danger-muted px-4 py-3 text-xs text-app-danger">{rulesError}</div>
        )}

        {actionError && (
          <div className="mb-3 rounded-lg bg-app-danger-muted px-4 py-3 text-xs text-app-danger">{actionError}</div>
        )}

        {/* Empty: no rules at all */}
        {!rulesLoading && !rulesError && rules.length === 0 && !showForm && (
          <EmptyState
            icon={MessageSquareOff}
            title="?±Î°ù??Í∑úÏπô???ÜÏäµ?àÎã§"
            description="?êÎèô ?ëÎãµ Í∑úÏπô??Ï∂îÍ??òÎ©¥ ?§Ïõå?úÍ? ?¨Ìï®??Î©îÏãúÏßÄ???êÎèô?ºÎ°ú ?µÏû•?©Îãà??
          >
            <Button variant="primary" size="sm" onClick={openCreateForm}>
              <Plus className="h-3.5 w-3.5" /> Ï≤?Í∑úÏπô Ï∂îÍ?
            </Button>
          </EmptyState>
        )}

        {/* Empty: search/filter with no results */}
        {!rulesLoading && !rulesError && rules.length > 0 && filteredRules.length === 0 && !showForm && (
          <EmptyState
            icon={Search}
            title="Í≤Ä??Í≤∞Í≥ºÍ∞Ä ?ÜÏäµ?àÎã§"
            description={
              searchQuery
                ? `"${searchQuery}"?Ä ?ºÏπò?òÎäî Í∑úÏπô???ÜÏäµ?àÎã§`
                : filterMode !== "all"
                  ? `${filterMode === "active" ? "?¨Ïö© Ï§? : "Ï§ëÏ???} Í∑úÏπô???ÜÏäµ?àÎã§`
                  : ""
            }
          >
            {searchQuery || filterMode !== "all" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(""); setFilterMode("all"); }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> ?ÑÌÑ∞ Ï¥àÍ∏∞??              </Button>
            ) : undefined}
          </EmptyState>
        )}

        {/* Inline create/edit form */}
        {showForm && (
          <div ref={formRef} className="mb-3 rounded-xl border border-app-border bg-app-card">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <span className="text-xs font-semibold text-app-text">
                {editingRuleId ? "Í∑úÏπô ?òÏ†ï" : "??Í∑úÏπô Ï∂îÍ?"}
              </span>
              <button
                onClick={closeForm}
                className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Ï∑®ÏÜå"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <Field label="Í∑úÏπô ?¥Î¶Ñ" error={validationErrors.name}>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="?? Í∞ÄÍ≤?Î¨∏Ïùò"
                  invalid={!!validationErrors.name}
                  autoComplete="off"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ï°∞Í±¥" hint={MATCH_TYPE_DESC[matchType]}>
                  <Select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as AutoReplyMatchType)}
                  >
                    <option value="keyword">?§Ïõå???¨Ìï®</option>
                    <option value="exact">?ïÌôï???ºÏπò</option>
                  </Select>
                </Field>
                <Field label="?§Ïõå??/ Î¨∏Íµ¨" error={validationErrors.matchValue}>
                  <Input
                    value={matchValue}
                    onChange={(e) => setMatchValue(e.target.value)}
                    placeholder="Í∞ÄÍ≤?
                    invalid={!!validationErrors.matchValue}
                    autoComplete="off"
                  />
                </Field>
              </div>

              <Field label="?êÎèô ?ëÎãµ ?¥Ïö© (Telegram Î©îÏãúÏßÄ)" error={validationErrors.replyContent}>
                <Textarea
                  rows={3}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Í∞ÄÍ≤©Ï? 10,000?êÏûÖ?àÎã§"
                  invalid={!!validationErrors.replyContent}
                />
                <span className="mt-1 block text-[11px] text-app-text-subtle">{replyContent.length}/4096</span>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ïø®Îã§??(?úÍ∞Ñ)" hint="Í∞ôÏ? ?¨Ïö©?êÏóêÍ≤??§Ïãú ?ëÎãµ?òÍ∏∞ÍπåÏ? ?ÄÍ∏?>
                  <Input
                    type="number"
                    min={0}
                    value={cooldownHours}
                    onChange={(e) => setCooldownHours(Number(e.target.value))}
                    invalid={!!validationErrors.cooldownHours}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="?ºÏùº ÏµúÎ? ?ëÎãµ" hint="??Í∑úÏπô???òÎ£® ÏµúÎ? ?ëÎãµ ?üÏàò">
                  <Input
                    type="number"
                    min={1}
                    value={maxRepliesPerDay}
                    onChange={(e) => setMaxRepliesPerDay(Number(e.target.value))}
                    invalid={!!validationErrors.maxRepliesPerDay}
                    inputMode="numeric"
                  />
                </Field>
              </div>

              {submitError && (
                <div className="rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{submitError}</div>
              )}

              <div className="luxury-bottom-cta">
              <div className="flex flex-wrap justify-end gap-2 w-full">
                <Button variant="ghost" onClick={closeForm}>Ï∑®ÏÜå</Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  {editingRuleId ? "?òÏ†ï ?ÑÎ£å" : "Í∑úÏπô Ï∂îÍ?"}
                </Button>
              </div>
              </div>
            </form>
          </div>
        )}

        {/* Rule list - compact operational rows */}
        {filteredRules.length > 0 && (
          <div className="space-y-1.5">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                data-testid={`auto-reply-rule-${rule.id}`}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all sm:flex-row sm:items-center sm:gap-3",
                  rule.isActive
                    ? "border-app-border bg-app-card"
                    : "border-app-border/30 bg-app-card/50 opacity-60"
                )}
              >
                {/* Left: info ??mobile?êÏÑú ??ïòÎ©?Ïª®ÌÖç?§Ìä∏ ?°ÏÖò ?úÌä∏ ?¥Í∏∞ */}
                <div
                  className={cn(
                    "flex-1 min-w-0",
                    isMobile && [
                      "cursor-pointer -mx-1 px-1 py-1 -my-1 rounded-lg active:bg-app-card-hover/60 transition-colors",
                    ]
                  )}
                  onClick={() => {
                    if (isMobile) {
                      setActionSheetRuleId(rule.id);
                      haptics?.light();
                    }
                  }}
                  role={isMobile ? "button" : undefined}
                  tabIndex={isMobile ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isMobile && e.key === "Enter") {
                      setActionSheetRuleId(rule.id);
                      haptics?.light();
                    }
                  }}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-app-text truncate max-w-[160px]" title={rule.name}>{rule.name}</span>
                    <Badge tone="neutral" className="shrink-0 text-[10px]">{MATCH_TYPE_LABEL[rule.matchType]}</Badge>
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); // ?¥Î≤§??Î≤ÑÎ∏îÎß?Î∞©Ï?
                        handleToggleRule(rule); 
                      }}
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        isMobile && "min-h-[44px] min-w-[44px] flex items-center justify-center",
                        rule.isActive
                          ? "bg-app-success-muted text-app-success hover:bg-app-success-muted/60"
                          : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                      )}
                    >
                      {rule.isActive ? "?¨Ïö© Ï§? : "Ï§ëÏ???}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-app-card-hover px-1.5 py-0.5 font-mono text-[11px] text-app-text-muted truncate max-w-[140px]" title={rule.matchValue}>
                      {rule.matchValue}
                    </span>
                    <span className="text-[11px] text-app-text-subtle">??/span>
                    <span className="truncate text-[11px] text-app-text-muted flex-1 min-w-0" title={rule.replyContent}>
                      {rule.replyContent.length > 60 ? rule.replyContent.slice(0, 60) + "..." : rule.replyContent}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); // ?¥Î≤§??Î≤ÑÎ∏îÎß?Î∞©Ï?
                        handleCopyReply(rule.replyContent); 
                      }}
                      className="shrink-0 rounded p-0.5 text-app-text-subtle hover:text-app-text transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Mobile tap indicator */}
                {isMobile && (
                  <div className="flex shrink-0 items-center justify-center py-1">
                    <MoreHorizontal className="h-4 w-4 text-app-text-subtle" />
                  </div>
                )}

                {/* Right: actions ??desktop only */}
                <div className={cn("flex shrink-0 items-center gap-1", isMobile && "hidden")}>
                  <button
                    type="button"
                    onClick={() => openEditForm(rule)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px]"
                  >
                    ?òÏ†ï
                  </button>
                  <button
                    type="button"
                    onClick={() => openDuplicateForm(rule)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px]"
                    title="Í∑úÏπô Î≥µÏ†ú"
                  >
                    Î≥µÏ†ú
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(rule.id)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted transition-colors min-h-[32px]"
                  >
                    ??†ú
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs ??expandable detail view */}
      <Panel title="?ëÎãµ Î°úÍ∑∏" description="ÏµúÍ∑º ?êÎèô ?ëÎãµ ?úÎèÑ Í∏∞Î°ù ??Î°úÍ∑∏Î•??¥Î¶≠?òÎ©¥ ?ÅÏÑ∏ ?ïÎ≥¥Î•?Î≥????àÏäµ?àÎã§">
        {logsLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {!logsLoading && logs.length === 0 && (
          <p className="py-2 text-xs text-app-text-muted">?ÑÏßÅ Í∏∞Î°ù???ÜÏäµ?àÎã§</p>
        )}
        {logs.length > 0 && (
          <div className="-mx-4">
            {logs.map((log) => {
              const meta = LOG_STATUS_TONE[log.status];
              const isExpanded = expandedLogId === log.id;
              const matchedRule = rules.find((r) => r.id === log.ruleId);
              return (
                <div key={log.id} className="border-b border-app-border last:border-b-0">
                  {/* Collapsed row ??clickable */}
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-app-card-hover/50 text-left"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-app-text">
                          {log.userName ?? log.userId}
                        </span>
                        <span className="text-app-text-subtle">:</span>
                        <span className="truncate text-app-text-muted">
                          {log.triggerMessage.length > 50
                            ? log.triggerMessage.slice(0, 50) + "..."
                            : log.triggerMessage}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-app-text-subtle">
                        <span>{formatDateTime(log.createdAt)}</span>
                        {matchedRule && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-app-card-hover px-1.5 py-0.5 text-[10px]">
                            <Hash className="h-2.5 w-2.5" />
                            {matchedRule.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-app-text-subtle transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded detail panel */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-app-border/50 bg-app-card/30 px-4 py-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* Trigger message */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                <MessageSquare className="h-3 w-3" />
                                ?∏Î¶¨Í±?Î©îÏãúÏßÄ
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-app-text">
                                {log.triggerMessage}
                              </p>
                            </div>

                            {/* Sent reply */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                <MessageSquareOff className="h-3 w-3" />
                                ?ÑÏÜ°???ëÎãµ
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-app-text">
                                {log.replySent}
                              </p>
                            </div>

                            {/* User info */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                <User className="h-3 w-3" />
                                ?¨Ïö©???ïÎ≥¥
                              </div>
                              <div className="mt-1 space-y-1 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">?¥Î¶Ñ:</span>
                                  <span className="font-medium text-app-text">{log.userName ?? '(?ÜÏùå)'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <AtSign className="h-3 w-3 text-app-text-subtle" />
                                  <span className="text-app-text-muted">ID:</span>
                                  <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-app-text">
                                    {log.userId}
                                  </code>
                                </div>
                              </div>
                            </div>

                            {/* Chat info */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                <Hash className="h-3 w-3" />
                                Ï±ÑÌåÖ ?ïÎ≥¥
                              </div>
                              <div className="mt-1 space-y-1 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">Ï±ÑÌåÖ ID:</span>
                                  <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-app-text">
                                    {log.chatId}
                                  </code>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">Í∑úÏπô:</span>
                                  <span className="font-medium text-app-text">
                                    {matchedRule ? matchedRule.name : log.ruleId.slice(0, 8) + '...'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">?úÍ∞Ñ:</span>
                                  <span className="font-mono text-app-text">{formatDateTime(log.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Status detail */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                Í≤∞Í≥º
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge tone={meta.tone}>{meta.label}</Badge>
                                <span className="text-xs text-app-text-muted">
                                  {log.status === 'success'
                                    ? '?ëÎãµ???±Í≥µ?ÅÏúºÎ°??ÑÏÜ°?òÏóà?µÎãà??'
                                    : log.status === 'failed'
                                      ? '?ëÎãµ ?ÑÏÜ° Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.'
                                      : '?îÎ†àÍ∑∏Îû® rate limit ?úÌïú?ºÎ°ú ?ëÎãµ??ÏßÄ?∞Îêò?àÏäµ?àÎã§.'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {(() => {
        const rule = rules.find(r => r.id === actionSheetRuleId);
        if (!rule) return null;
        return (
          <BottomSheetWrapper
            open={!!actionSheetRuleId}
            onClose={() => setActionSheetRuleId(null)}
            title={rule.name}
          >
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { openEditForm(rule); setActionSheetRuleId(null); haptics?.light(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-app-card-hover transition-colors text-left active:scale-[0.98]"
              >
                <Edit className="h-5 w-5 text-app-primary" />
                <div>
                  <p className="text-sm font-medium text-app-text">?òÏ†ï</p>
                  <p className="text-xs text-app-text-muted">Í∑úÏπô ?¥Ïö©??Î≥ÄÍ≤ΩÌï©?àÎã§</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { openDuplicateForm(rule); setActionSheetRuleId(null); haptics?.light(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-app-card-hover transition-colors text-left active:scale-[0.98]"
              >
                <Copy className="h-5 w-5 text-app-info" />
                <div>
                  <p className="text-sm font-medium text-app-text">Î≥µÏ†ú</p>
                  <p className="text-xs text-app-text-muted">Í∑úÏπô??Î≥µÏÇ¨?òÏó¨ ??Í∑úÏπô??ÎßåÎì≠?àÎã§</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDeleteId(rule.id); setActionSheetRuleId(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-app-danger-muted transition-colors text-left active:scale-[0.98]"
              >
                <Trash2 className="h-5 w-5 text-app-danger" />
                <div>
                  <p className="text-sm font-medium text-app-danger">??†ú</p>
                  <p className="text-xs text-app-text-muted">??Í∑úÏπô???ÅÍµ¨ ??†ú?©Îãà??/p>
                </div>
              </button>
            </div>
          </BottomSheetWrapper>
        );
      })()}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Í∑úÏπô ??†ú"
        description="???êÎèô ?ëÎãµ Í∑úÏπô???ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?"
        variant="danger"
        confirmLabel="??†ú"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}