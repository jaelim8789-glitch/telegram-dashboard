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
import { WatermarkGate } from "@/components/workspace/WatermarkGate";
import { useSwipeTemplate } from "@/hooks/useSwipeTemplate"; // 스와이프 템플릿 훅 추가
import { QuickTemplateSelector } from "@/components/ui/QuickTemplateSelector"; // 퀵 템플릿 선택기 추가

const MATCH_TYPE_LABEL: Record<AutoReplyMatchType, string> = {
  keyword: "키워드 포함",
  exact: "정확히 일치",
};

const MATCH_TYPE_DESC: Record<AutoReplyMatchType, string> = {
  keyword: "메시지에 이 키워드가 포함되면 응답",
  exact: "메시지가 이 문구와 완전히 일치하면 응답",
};

const LOG_STATUS_TONE: Record<AutoReplyLogStatus, { tone: "success" | "warning" | "danger"; label: string }> = {
  success: { tone: "success", label: "응답 완료" },
  failed: { tone: "danger", label: "실패" },
  rate_limited: { tone: "warning", label: "제한됨" },
};

import { formatDateTime } from "@/lib/formatTime";

function formatRuleDateTime(iso: string): string {
  const d = new Date(`${iso}Z`);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function getValidationErrors(name: string, matchValue: string, replyContent: string, cooldownHours: number, maxRepliesPerDay: number) {
  const errors: Partial<Record<"name" | "matchValue" | "replyContent" | "cooldownHours" | "maxRepliesPerDay", string>> = {};
  if (!name.trim()) errors.name = "규칙 이름을 입력하세요";
  if (!matchValue.trim()) errors.matchValue = "키워드 또는 문구를 입력하세요";
  if (matchValue.trim().length > 200) errors.matchValue = "200자 이하로 입력하세요";
  if (!replyContent.trim()) errors.replyContent = "응답 내용을 입력하세요";
  if (replyContent.trim().length > 4096) errors.replyContent = "메시지가 너무 깁니다 (최대 4096자)";
  if (cooldownHours < 0) errors.cooldownHours = "0 이상 입력하세요";
  if (maxRepliesPerDay < 1) errors.maxRepliesPerDay = "1 이상 입력하세요";
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

  // ── New features ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);

  const { toast } = useToast();
  const haptics = useHapticFeedback();

  const [isMobile, setIsMobile] = useState(false);
  const [actionSheetRuleId, setActionSheetRuleId] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── RuntimeManager 캐시에서 AutoReply 데이터 즉시 로드 ──
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
        // 캐시 미스 — RuntimeManager를 통해 cache 갱신 + notify
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

  // 백그라운드 캐시 업데이트 시 로컬 상태 동기화
  useEffect(() => {
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

  // ── Filtered & searched rules ──
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
      toast("success", next ? "자동 응답이 켜졌습니다" : "자동 응답이 꺼졌습니다");
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "설정을 변경하지 못했습니다.");
      toast("error", "자동 응답 설정 변경에 실패했습니다");
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
      toast("success", updated.isActive ? "규칙이 활성화되었습니다" : "규칙이 비활성화되었습니다");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "규칙을 수정하지 못했습니다.");
      toast("error", "규칙 상태 변경에 실패했습니다");
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
    setName(rule.name + " (사본)");
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
        toast("success", "규칙이 수정되었습니다");
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
        toast("success", "규칙이 추가되었습니다");
      }
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "규칙을 저장하지 못했습니다.");
      toast("error", "규칙 저장에 실패했습니다");
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
      toast("success", "규칙이 삭제되었습니다");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "규칙을 삭제하지 못했습니다.");
      toast("error", "규칙 삭제에 실패했습니다");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function handleCopyReply(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast("success", "응답 내용이 복사되었습니다"),
      () => toast("error", "클립보드 복사에 실패했습니다")
    );
  }

  if (!account) {
    return (
      <Panel title="자동 응답">
        <p className="text-sm text-app-text-muted">사이드바에서 계정을 선택하세요</p>
      </Panel>
    );
  }

  // 템플릿 상태 추가
  const [templates, setTemplates] = useState([
    { id: '1', name: '기본 응답', content: '안녕하세요, 확인 후 답변드리겠습니다.' },
    { id: '2', name: '업무시간 안내', content: '업무시간은 평일 09:00~18:00입니다.' },
    { id: '3', name: '휴무일 안내', content: '주말 및 공휴일은 휴무입니다.' },
  ]);

  // 최근 메시지 상태 추가
  const [recentMessages, setRecentMessages] = useState([
    '안녕하세요',
    '문의 드립니다',
    '확인 부탁드립니다'
  ]);

  // 스와이프 템플릿 훅 사용
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
      // 템플릿을 현재 입력 필드에 삽입하는 로직
      console.log('템플릿 선택:', template);
    },
    onRecentMessageSelect: (message: string) => {
      // 최근 메시지를 현재 입력 필드에 삽입하는 로직
      console.log('최근 메시지 선택:', message);
    }
  });

  // 폼 레퍼런스에 스와이프 리스너 연결
  useEffect(() => {
    if (formRef.current) {
      const cleanup = attachSwipeListeners(formRef.current);
      return cleanup;
    }
  }, [attachSwipeListeners]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      {/* Master toggle */}
      <Panel title="자동 응답" description={`${account.name ?? account.phone} 계정의 자동 응답을 켜거나 끕니다`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-app-text">
              {enabled ? "자동 응답 켜짐" : "자동 응답 꺼짐"}
            </span>
            <span className="text-xs text-app-text-muted">
              {enabled 
                ? "등록된 규칙이 메시지에 자동으로 응답하고 있습니다" 
                : "등록된 규칙이 메시지에 자동으로 응답하지 않습니다"}
            </span>
          </div>
          <Button
            variant={enabled ? "outline-destructive" : "outline-success"}
            size="sm"
            onClick={handleToggleMaster}
            disabled={toggling}
            className="whitespace-nowrap"
          >
            {toggling ? (
              <span>처리중...</span>
            ) : enabled ? (
              <span>끄기</span>
            ) : (
              <span>켜기</span>
            )}
          </Button>
        </div>
        {toggleError && (
          <div className="mt-2 rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{toggleError}</div>
        )}
      </Panel>

      {/* 퀵 템플릿 선택기 추가 */}
      <div className="px-4">
        <QuickTemplateSelector 
          templates={templates}
          onTemplateSelect={(template) => {
            // 선택된 템플릿을 현재 입력 필드에 삽입
            console.log('선택된 템플릿:', template);
          }}
          onAddTemplate={(name, content) => {
            // 새 템플릿 추가
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

      {/* Watermark + Referral Gate — free plan users must enable watermark */}
      <WatermarkGate plan={plan} />

      {/* Rules list */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-app-text">
            규칙 {!rulesLoading && `(${filteredRules.length}/${rules.length})`}
          </h3>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={openCreateForm} className="shrink-0">
              <Plus className="h-3.5 w-3.5" /> 새 규칙
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
                placeholder="규칙 이름 / 키워드 / 응답 검색"
                className="w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-app-text-muted hover:text-app-text transition-colors"
                  aria-label="검색 초기화"
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
                  {f === "all" ? "전체" : f === "active" ? "사용 중" : "중지됨"}
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
            title="등록된 규칙이 없습니다"
            description="자동 응답 규칙을 추가하면 키워드가 포함된 메시지에 자동으로 답장합니다"
          >
            <Button variant="primary" size="sm" onClick={openCreateForm}>
              <Plus className="h-3.5 w-3.5" /> 첫 규칙 추가
            </Button>
          </EmptyState>
        )}

        {/* Empty: search/filter with no results */}
        {!rulesLoading && !rulesError && rules.length > 0 && filteredRules.length === 0 && !showForm && (
          <EmptyState
            icon={Search}
            title="검색 결과가 없습니다"
            description={
              searchQuery
                ? `"${searchQuery}"와 일치하는 규칙이 없습니다`
                : filterMode !== "all"
                  ? `${filterMode === "active" ? "사용 중" : "중지된"} 규칙이 없습니다`
                  : ""
            }
          >
            {searchQuery || filterMode !== "all" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(""); setFilterMode("all"); }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> 필터 초기화
              </Button>
            ) : undefined}
          </EmptyState>
        )}

        {/* Inline create/edit form */}
        {showForm && (
          <div ref={formRef} className="mb-3 rounded-xl border border-app-border bg-app-card">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <span className="text-xs font-semibold text-app-text">
                {editingRuleId ? "규칙 수정" : "새 규칙 추가"}
              </span>
              <button
                onClick={closeForm}
                className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="취소"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <Field label="규칙 이름" error={validationErrors.name}>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 가격 문의"
                  invalid={!!validationErrors.name}
                  autoComplete="off"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="조건" hint={MATCH_TYPE_DESC[matchType]}>
                  <Select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as AutoReplyMatchType)}
                  >
                    <option value="keyword">키워드 포함</option>
                    <option value="exact">정확히 일치</option>
                  </Select>
                </Field>
                <Field label="키워드 / 문구" error={validationErrors.matchValue}>
                  <Input
                    value={matchValue}
                    onChange={(e) => setMatchValue(e.target.value)}
                    placeholder="가격"
                    invalid={!!validationErrors.matchValue}
                    autoComplete="off"
                  />
                </Field>
              </div>

              <Field label="자동 응답 내용 (Telegram 메시지)" error={validationErrors.replyContent}>
                <Textarea
                  rows={3}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="가격은 10,000원입니다"
                  invalid={!!validationErrors.replyContent}
                />
                <span className="mt-1 block text-[11px] text-app-text-subtle">{replyContent.length}/4096</span>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="쿨다운 (시간)" hint="같은 사용자에게 다시 응답하기까지 대기">
                  <Input
                    type="number"
                    min={0}
                    value={cooldownHours}
                    onChange={(e) => setCooldownHours(Number(e.target.value))}
                    invalid={!!validationErrors.cooldownHours}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="일일 최대 응답" hint="이 규칙의 하루 최대 응답 횟수">
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
                <Button variant="ghost" onClick={closeForm}>취소</Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  {editingRuleId ? "수정 완료" : "규칙 추가"}
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
                {/* Left: info — mobile에서 탭하면 컨텍스트 액션 시트 열기 */}
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
                      haptics.light();
                    }
                  }}
                  role={isMobile ? "button" : undefined}
                  tabIndex={isMobile ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isMobile && e.key === "Enter") {
                      setActionSheetRuleId(rule.id);
                      haptics.light();
                    }
                  }}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-app-text truncate max-w-[160px]" title={rule.name}>{rule.name}</span>
                    <Badge tone="neutral" className="shrink-0 text-[10px]">{MATCH_TYPE_LABEL[rule.matchType]}</Badge>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleRule(rule); }}
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        isMobile && "min-h-[32px] min-w-[32px] flex items-center justify-center",
                        rule.isActive
                          ? "bg-app-success-muted text-app-success hover:bg-app-success-muted/60"
                          : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                      )}
                    >
                      {rule.isActive ? "사용 중" : "중지됨"}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-app-card-hover px-1.5 py-0.5 font-mono text-[11px] text-app-text-muted truncate max-w-[140px]" title={rule.matchValue}>
                      {rule.matchValue}
                    </span>
                    <span className="text-[11px] text-app-text-subtle">→</span>
                    <span className="truncate text-[11px] text-app-text-muted flex-1 min-w-0" title={rule.replyContent}>
                      {rule.replyContent.length > 60 ? rule.replyContent.slice(0, 60) + "..." : rule.replyContent}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCopyReply(rule.replyContent); }}
                      className="shrink-0 rounded p-0.5 text-app-text-subtle hover:text-app-text transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
                      aria-label="응답 내용 복사"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-app-text-subtle">
                    <span>쿨다운 {rule.cooldownHours}시간</span>
                    <span>일 {rule.maxRepliesPerDay}회</span>
                    <span>{formatRuleDateTime(rule.createdAt)}</span>
                  </div>
                </div>

                {/* Mobile tap indicator */}
                {isMobile && (
                  <div className="flex shrink-0 items-center justify-center py-1">
                    <MoreHorizontal className="h-4 w-4 text-app-text-subtle" />
                  </div>
                )}

                {/* Right: actions — desktop only */}
                <div className={cn("flex shrink-0 items-center gap-1", isMobile && "hidden")}>
                  <button
                    type="button"
                    onClick={() => openEditForm(rule)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px]"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => openDuplicateForm(rule)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px]"
                    title="규칙 복제"
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(rule.id)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted transition-colors min-h-[32px]"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs — expandable detail view */}
      <Panel title="응답 로그" description="최근 자동 응답 시도 기록 — 로그를 클릭하면 상세 정보를 볼 수 있습니다">
        {logsLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {!logsLoading && logs.length === 0 && (
          <p className="py-2 text-xs text-app-text-muted">아직 기록이 없습니다</p>
        )}
        {logs.length > 0 && (
          <div className="-mx-4">
            {logs.map((log) => {
              const meta = LOG_STATUS_TONE[log.status];
              const isExpanded = expandedLogId === log.id;
              const matchedRule = rules.find((r) => r.id === log.ruleId);
              return (
                <div key={log.id} className="border-b border-app-border last:border-b-0">
                  {/* Collapsed row — clickable */}
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
                                트리거 메시지
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-app-text">
                                {log.triggerMessage}
                              </p>
                            </div>

                            {/* Sent reply */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                <MessageSquareOff className="h-3 w-3" />
                                전송된 응답
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-app-text">
                                {log.replySent}
                              </p>
                            </div>

                            {/* User info */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                <User className="h-3 w-3" />
                                사용자 정보
                              </div>
                              <div className="mt-1 space-y-1 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">이름:</span>
                                  <span className="font-medium text-app-text">{log.userName ?? '(없음)'}</span>
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
                                채팅 정보
                              </div>
                              <div className="mt-1 space-y-1 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">채팅 ID:</span>
                                  <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-app-text">
                                    {log.chatId}
                                  </code>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">규칙:</span>
                                  <span className="font-medium text-app-text">
                                    {matchedRule ? matchedRule.name : log.ruleId.slice(0, 8) + '...'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-app-text-muted">시간:</span>
                                  <span className="font-mono text-app-text">{formatDateTime(log.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Status detail */}
                            <div className="rounded-lg border border-app-border bg-app-bg/50 p-2.5 sm:col-span-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-app-text-muted">
                                결과
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge tone={meta.tone}>{meta.label}</Badge>
                                <span className="text-xs text-app-text-muted">
                                  {log.status === 'success'
                                    ? '응답이 성공적으로 전송되었습니다.'
                                    : log.status === 'failed'
                                      ? '응답 전송 중 오류가 발생했습니다.'
                                      : '텔레그램 rate limit 제한으로 응답이 지연되었습니다.'}
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
                onClick={() => { openEditForm(rule); setActionSheetRuleId(null); haptics.light(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-app-card-hover transition-colors text-left active:scale-[0.98]"
              >
                <Edit className="h-5 w-5 text-app-primary" />
                <div>
                  <p className="text-sm font-medium text-app-text">수정</p>
                  <p className="text-xs text-app-text-muted">규칙 내용을 변경합니다</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { openDuplicateForm(rule); setActionSheetRuleId(null); haptics.light(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-app-card-hover transition-colors text-left active:scale-[0.98]"
              >
                <Copy className="h-5 w-5 text-app-info" />
                <div>
                  <p className="text-sm font-medium text-app-text">복제</p>
                  <p className="text-xs text-app-text-muted">규칙을 복사하여 새 규칙을 만듭니다</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDeleteId(rule.id); setActionSheetRuleId(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-app-danger-muted transition-colors text-left active:scale-[0.98]"
              >
                <Trash2 className="h-5 w-5 text-app-danger" />
                <div>
                  <p className="text-sm font-medium text-app-danger">삭제</p>
                  <p className="text-xs text-app-text-muted">이 규칙을 영구 삭제합니다</p>
                </div>
              </button>
            </div>
          </BottomSheetWrapper>
        );
      })()}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="규칙 삭제"
        description="이 자동 응답 규칙을 정말 삭제하시겠습니까?"
        variant="danger"
        confirmLabel="삭제"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}