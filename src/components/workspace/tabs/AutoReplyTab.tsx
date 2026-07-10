"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { MessageSquareOff, Plus, X, Eye, EyeOff } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AutoReplyLog, AutoReplyLogStatus, AutoReplyMatchType, AutoReplyRule } from "@/types";

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

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

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

export function AutoReplyTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
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

  const formRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);

  const [visibleContentId, setVisibleContentId] = useState<string | null>(null);

  async function loadSettings(accountId: string) {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const settings = await api.fetchAutoReplySettings(accountId);
      setEnabled(settings.autoReplyEnabled);
      setRules(settings.rules);
    } catch (err) {
      setRules([]);
      setRulesError(err instanceof Error ? err.message : "자동 응답 설정을 불러오지 못했습니다.");
    } finally {
      setRulesLoading(false);
    }
  }

  async function loadLogs(accountId: string) {
    setLogsLoading(true);
    try {
      setLogs(await api.fetchAutoReplyLogs(accountId));
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    setToggleError(null);
    setSubmitError(null);
    setActionError(null);
    if (selectedAccountId) {
      loadSettings(selectedAccountId);
      loadLogs(selectedAccountId);
    } else {
      setRules([]);
      setLogs([]);
    }
  }, [selectedAccountId]);

  async function handleToggleMaster(next: boolean) {
    if (!selectedAccountId || toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      const result = await api.toggleAutoReply(selectedAccountId, next);
      setEnabled(result);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "설정을 변경하지 못했습니다.");
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "규칙을 수정하지 못했습니다.");
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
      }
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "규칙을 저장하지 못했습니다.");
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "규칙을 삭제하지 못했습니다.");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  if (!account) {
    return (
      <Panel title="자동 응답">
        <p className="text-sm text-app-text-muted">사이드바에서 계정을 선택하세요</p>
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Master toggle */}
      <Panel title="자동 응답" description={`${account.name ?? account.phone} 계정의 자동 응답을 켜거나 끕니다`}>
        <Toggle
          label={enabled ? "자동 응답 켜짐" : "자동 응답 꺼짐"}
          description="켜져 있어야 등록된 규칙이 메시지에 자동으로 응답합니다"
          checked={enabled}
          onChange={handleToggleMaster}
          disabled={toggling}
        />
        {toggleError && (
          <div className="mt-2 rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{toggleError}</div>
        )}
      </Panel>

      {/* Rules list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-app-text">
            규칙 {!rulesLoading && `(${rules.length})`}
          </h3>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={openCreateForm}>
              <Plus className="h-3.5 w-3.5" /> 새 규칙
            </Button>
          )}
        </div>

        {rulesLoading && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {rulesError && (
          <div className="mb-3 rounded-lg bg-app-danger-muted px-4 py-3 text-xs text-app-danger">{rulesError}</div>
        )}

        {actionError && (
          <div className="mb-3 rounded-lg bg-app-danger-muted px-4 py-3 text-xs text-app-danger">{actionError}</div>
        )}

        {!rulesLoading && !rulesError && rules.length === 0 && !showForm && (
          <EmptyState
            icon={MessageSquareOff}
            title="등록된 규칙이 없습니다"
            description="자동 응답 규칙을 추가하면 키워드가 포함된 메시지에 자동으로 답장합니다"
            action={
              <Button variant="primary" size="sm" onClick={openCreateForm}>
                <Plus className="h-3.5 w-3.5" /> 첫 규칙 추가
              </Button>
            }
          />
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
                className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
                aria-label="취소"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <Field label="규칙 이름" error={validationErrors.name}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 가격 문의"
                  invalid={!!validationErrors.name}
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
                  />
                </Field>
                <Field label="일일 최대 응답" hint="이 규칙의 하루 최대 응답 횟수">
                  <Input
                    type="number"
                    min={1}
                    value={maxRepliesPerDay}
                    onChange={(e) => setMaxRepliesPerDay(Number(e.target.value))}
                    invalid={!!validationErrors.maxRepliesPerDay}
                  />
                </Field>
              </div>

              {submitError && (
                <div className="rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{submitError}</div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeForm}>취소</Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  {editingRuleId ? "수정 완료" : "규칙 추가"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Rule cards */}
        {rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                data-testid={`auto-reply-rule-${rule.id}`}
                className={cn(
                  "rounded-xl border p-4",
                  rule.isActive
                    ? "border-app-border bg-app-card"
                    : "border-app-border/30 bg-app-card/50 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-app-text">{rule.name}</span>
                      <Badge tone="neutral">{MATCH_TYPE_LABEL[rule.matchType]}</Badge>
                      <Badge tone={rule.isActive ? "success" : "neutral"}>
                        {rule.isActive ? "사용 중" : "중지됨"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-app-text-muted">
                      <span className="shrink-0 rounded bg-app-card-hover px-1.5 py-0.5 font-mono text-[11px]">
                        {rule.matchValue}
                      </span>
                      <span className="mt-0.5">→</span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleContentId(
                            visibleContentId === rule.id ? null : rule.id
                          )
                        }
                        className="flex-1 truncate text-left hover:text-app-text transition-colors"
                        title={rule.replyContent}
                      >
                        {visibleContentId === rule.id
                          ? rule.replyContent
                          : rule.replyContent.length > 80
                            ? `${rule.replyContent.slice(0, 80)}...`
                            : rule.replyContent}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleContentId(visibleContentId === rule.id ? null : rule.id)}
                        className="shrink-0 rounded p-0.5 text-app-text-subtle hover:text-app-text transition-colors"
                        aria-label={visibleContentId === rule.id ? "내용 숨기기" : "전체 내용 보기"}
                      >
                        {visibleContentId === rule.id
                          ? <EyeOff className="h-3 w-3" />
                          : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-app-text-subtle">
                      <span>쿨다운 {rule.cooldownHours}시간</span>
                      <span>일일 최대 {rule.maxRepliesPerDay}회</span>
                      <span>만든 날짜 {formatRuleDateTime(rule.createdAt)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-0 sm:shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(rule)}
                      aria-label="규칙 수정"
                    >
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRule(rule)}
                    >
                      {rule.isActive ? "중지" : "재개"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDeleteId(rule.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs */}
      <Panel title="응답 로그" description="최근 자동 응답 시도 기록">
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
            <div className="divide-y divide-app-border">
              {logs.map((log) => {
                const meta = LOG_STATUS_TONE[log.status];
                return (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="truncate text-app-text">
                        {log.userName ?? log.userId}: {log.triggerMessage}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-app-text-subtle">
                        <span>{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

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
