"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MessageSquareOff } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AutoReplyLog, AutoReplyLogStatus, AutoReplyMatchType, AutoReplyRule } from "@/types";

const MATCH_TYPE_LABEL: Record<AutoReplyMatchType, string> = {
  keyword: "키워드 포함",
  exact: "정확히 일치",
};

const LOG_STATUS_TONE: Record<AutoReplyLogStatus, { tone: "success" | "warning" | "danger"; label: string }> = {
  success: { tone: "success", label: "응답 완료" },
  failed: { tone: "danger", label: "실패" },
  rate_limited: { tone: "warning", label: "제한됨" },
};

function formatDateTime(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
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

  const [logs, setLogs] = useState<AutoReplyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<AutoReplyMatchType>("keyword");
  const [matchValue, setMatchValue] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [cooldownHours, setCooldownHours] = useState(1);
  const [maxRepliesPerDay, setMaxRepliesPerDay] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    try {
      const updated = await api.updateAutoReplyRule(selectedAccountId, rule.id, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "규칙을 수정하지 못했습니다.");
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!selectedAccountId) return;
    try {
      await api.deleteAutoReplyRule(selectedAccountId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "규칙을 삭제하지 못했습니다.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !name.trim() || !matchValue.trim() || !replyContent.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const rule = await api.createAutoReplyRule(selectedAccountId, {
        name: name.trim(),
        matchType,
        matchValue: matchValue.trim(),
        replyContent: replyContent.trim(),
        cooldownHours,
        maxRepliesPerDay,
      });
      setRules((prev) => [rule, ...prev]);
      setName("");
      setMatchValue("");
      setReplyContent("");
      setCooldownHours(1);
      setMaxRepliesPerDay(100);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "규칙을 추가하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!account) {
    return (
      <Panel title="자동 응답">
        <p className="text-sm text-app-text-muted">먼저 사이드바에서 계정을 선택해주세요.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="자동 응답"
        description={`선택된 계정: ${account.name ?? account.phone}. 켜져 있어야 아래 규칙이 실제로 동작합니다.`}
      >
        <Toggle
          label={enabled ? "자동 응답 켜짐" : "자동 응답 꺼짐"}
          description="키워드가 포함된 메시지가 오면 아래 규칙에 따라 자동으로 답장합니다."
          checked={enabled}
          onChange={handleToggleMaster}
          disabled={toggling}
        />
        {toggleError && <p className="mt-2 text-xs text-app-danger">{toggleError}</p>}
      </Panel>

      <Panel title="새 규칙 추가">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field label="규칙 이름">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 가격 문의" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="조건">
                <Select value={matchType} onChange={(e) => setMatchType(e.target.value as AutoReplyMatchType)}>
                  <option value="keyword">키워드 포함</option>
                  <option value="exact">정확히 일치</option>
                </Select>
              </Field>
              <Field label="키워드 / 문구">
                <Input value={matchValue} onChange={(e) => setMatchValue(e.target.value)} placeholder="가격" required />
              </Field>
            </div>
            <Field label="자동 응답 내용">
              <Textarea
                rows={3}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="가격은 10,000원입니다"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="쿨다운 (시간)" hint="같은 사용자에게 다시 응답하기까지 대기 시간">
                <Input
                  type="number"
                  min={0}
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(Number(e.target.value))}
                />
              </Field>
              <Field label="일일 최대 응답 횟수">
                <Input
                  type="number"
                  min={1}
                  value={maxRepliesPerDay}
                  onChange={(e) => setMaxRepliesPerDay(Number(e.target.value))}
                />
              </Field>
            </div>
          </div>

          {submitError && <p className="mt-3 text-xs text-app-danger">{submitError}</p>}

          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "추가 중..." : "규칙 추가"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="등록된 규칙">
        {rulesLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {rulesError && <p className="text-xs text-app-danger">{rulesError}</p>}
        {!rulesLoading && !rulesError && rules.length === 0 && (
          <EmptyState icon={MessageSquareOff} title="등록된 자동 응답 규칙이 없습니다" description="위 폼에서 첫 규칙을 추가해보세요." />
        )}
        {rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                data-testid={`auto-reply-rule-${rule.id}`}
                className={cn(
                  "rounded-2xl border p-3",
                  rule.isActive ? "border-app-border bg-app-card" : "border-app-border/40 bg-app-card/60 opacity-70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-app-text">{rule.name}</span>
                      <Badge tone="neutral">{MATCH_TYPE_LABEL[rule.matchType]}</Badge>
                      <Badge tone={rule.isActive ? "success" : "neutral"}>{rule.isActive ? "사용 중" : "중지됨"}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-app-text-muted">
                      &ldquo;{rule.matchValue}&rdquo; → {rule.replyContent}
                    </div>
                    <div className="mt-1 text-[11px] text-app-text-subtle">
                      쿨다운 {rule.cooldownHours}시간 · 일일 최대 {rule.maxRepliesPerDay}회
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleRule(rule)}
                      size="sm"
                    >
                      {rule.isActive ? "중지" : "재개"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteRule(rule.id)}
                      size="sm"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="응답 로그" description="최근 자동 응답 시도 기록입니다.">
        {logsLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!logsLoading && logs.length === 0 && <p className="text-xs text-app-text-muted">아직 기록이 없습니다.</p>}
        <div className="divide-y divide-app-border">
          {logs.map((log) => {
            const meta = LOG_STATUS_TONE[log.status];
            return (
              <div key={log.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="truncate text-app-text">
                    {log.userName ?? log.userId}: {log.triggerMessage}
                  </div>
                  <div className="text-xs text-app-text-subtle">{formatDateTime(log.createdAt)}</div>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
