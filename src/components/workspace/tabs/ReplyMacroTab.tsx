"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { SendHorizonal, Plus, X, Eye, EyeOff, Copy, Play, Clock } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import {
  fetchReplyMacros,
  createReplyMacro,
  updateReplyMacro,
  deleteReplyMacro,
  executeReplyMacro,
  type ReplyMacroInput,
} from "@/lib/api";
import type { ReplyMacro } from "@/types";
import { getAccountDisplayName } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

function getValidationErrors(name: string, targetChats: string, messageContent: string, maxSendsPerDay: number) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "매크로 이름을 입력하세요";
  if (!targetChats.trim()) errors.targetChats = "대상 채팅방을 입력하세요";
  if (!messageContent.trim()) errors.messageContent = "메시지 내용을 입력하세요";
  if (messageContent.trim().length > 4096) errors.messageContent = "메시지가 너무 깁니다 (최대 4096자)";
  if (maxSendsPerDay < 1) errors.maxSendsPerDay = "1 이상 입력하세요";
  return errors;
}

export function ReplyMacroTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);

  const [macros, setMacros] = useState<ReplyMacro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetChats, setTargetChats] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [scheduleType, setScheduleType] = useState<"interval" | "fixed">("interval");
  const [intervalHours, setIntervalHours] = useState(24);
  const [fixedTime, setFixedTime] = useState("09:00");
  const [maxSendsPerDay, setMaxSendsPerDay] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [executeConfirmId, setExecuteConfirmId] = useState<string | null>(null);

  const [visibleContentId, setVisibleContentId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);

  const loadMacros = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReplyMacros(selectedAccountId);
      setMacros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로딩 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) loadMacros();
    else setMacros([]);
  }, [selectedAccountId, loadMacros]);

  function resetForm() {
    setName("");
    setTargetChats("");
    setMessageContent("");
    setScheduleType("interval");
    setIntervalHours(24);
    setFixedTime("09:00");
    setMaxSendsPerDay(10);
    setEditingId(null);
    setSubmitError(null);
    setValidationErrors({});
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startEdit(macro: ReplyMacro) {
    resetForm();
    setEditingId(macro.id);
    setName(macro.name);
    setTargetChats(macro.targetChats.join("\n"));
    setMessageContent(macro.messageContent);
    setScheduleType(macro.scheduleType);
    setIntervalHours(macro.intervalHours);
    setFixedTime(macro.fixedTime || "09:00");
    setMaxSendsPerDay(macro.maxSendsPerDay);
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setSubmitError(null);
    setValidationErrors({});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || submitting || submitLockRef.current) return;

    const errors = getValidationErrors(name, targetChats, messageContent, maxSendsPerDay);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    const input: ReplyMacroInput = {
      name: name.trim(),
      targetChats: targetChats.split("\n").map((s) => s.trim()).filter(Boolean),
      messageContent: messageContent.trim(),
      scheduleType,
      intervalHours,
      fixedTime: scheduleType === "fixed" ? fixedTime : undefined,
      maxSendsPerDay,
    };
    try {
      if (editingId) {
        await updateReplyMacro(selectedAccountId, editingId, input);
      } else {
        await createReplyMacro(selectedAccountId, input);
      }
      closeForm();
      await loadMacros();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  async function handleConfirmDelete() {
    if (!selectedAccountId || !confirmDeleteId) return;
    try {
      await deleteReplyMacro(selectedAccountId, confirmDeleteId);
      await loadMacros();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleConfirmExecute() {
    if (!selectedAccountId || !executeConfirmId) return;
    try {
      await executeReplyMacro(selectedAccountId, executeConfirmId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
    } finally {
      setExecuteConfirmId(null);
    }
  }

  function handleCopyContent(content: string) {
    navigator.clipboard.writeText(content).catch(() => {});
  }

  if (!account) {
    return (
      <Panel title="답장매크로">
        <p className="text-sm text-app-text-muted">사이드바에서 계정을 선택하세요</p>
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-app-text">답장매크로</h2>
          <p className="text-xs text-app-text-muted">{getAccountDisplayName(account)}</p>
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" onClick={openCreateForm}>
            <Plus className="h-3.5 w-3.5" /> 새 매크로
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-app-danger-muted px-4 py-3 text-xs text-app-danger">{error}</div>
      )}

      {loading && macros.length === 0 && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!loading && !error && macros.length === 0 && !showForm && (
        <EmptyState
          icon={SendHorizonal}
          title="등록된 매크로 없음"
          description="답장매크로는 특정 채팅방에 정해진 시간/간격으로 메시지를 전송합니다"
          action={
            <Button variant="primary" size="sm" onClick={openCreateForm}>
              <Plus className="h-3.5 w-3.5" /> 첫 매크로 추가
            </Button>
          }
        />
      )}

      {/* Inline create/edit form */}
      {showForm && (
        <div ref={formRef} className="rounded-xl border border-app-border bg-app-card">
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <span className="text-xs font-semibold text-app-text">
              {editingId ? "매크로 수정" : "새 매크로 추가"}
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
            <Field label="매크로 이름" error={validationErrors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 아침 인사"
                invalid={!!validationErrors.name}
              />
            </Field>

            <Field
              label="대상 채팅방 ID"
              hint="한 줄에 하나씩 입력"
              error={validationErrors.targetChats}
            >
              <Textarea
                value={targetChats}
                onChange={(e) => setTargetChats(e.target.value)}
                rows={2}
                placeholder="chat_id_1"
                invalid={!!validationErrors.targetChats}
              />
            </Field>

            <Field label="메시지 내용" error={validationErrors.messageContent}>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={2}
                placeholder="보낼 메시지"
                invalid={!!validationErrors.messageContent}
              />
              <span className="mt-1 block text-[11px] text-app-text-subtle">{messageContent.length}/4096</span>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="일정">
                <Select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as "interval" | "fixed")}
                >
                  <option value="interval">간격</option>
                  <option value="fixed">고정 시간</option>
                </Select>
              </Field>
              {scheduleType === "interval" ? (
                <Field label="간격 (시간)">
                  <Input
                    type="number"
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(Number(e.target.value))}
                    min={1}
                  />
                </Field>
              ) : (
                <Field label="고정 시간">
                  <Input
                    type="time"
                    value={fixedTime}
                    onChange={(e) => setFixedTime(e.target.value)}
                  />
                </Field>
              )}
              <Field label="일일 최대 전송">
                <Input
                  type="number"
                  value={maxSendsPerDay}
                  onChange={(e) => setMaxSendsPerDay(Number(e.target.value))}
                  min={1}
                  invalid={!!validationErrors.maxSendsPerDay}
                />
              </Field>
            </div>

            {submitError && (
              <div className="rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{submitError}</div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeForm}>취소</Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {editingId ? "수정 완료" : "매크로 추가"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Macro list */}
      {macros.length > 0 && (
        <div className="space-y-2">
          {macros.map((macro) => (
            <div
              key={macro.id}
              className={cn(
                "rounded-xl border p-4",
                macro.isActive
                  ? "border-app-border bg-app-card"
                  : "border-app-border/30 bg-app-card/50 opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-app-text">{macro.name}</span>
                    <Badge tone={macro.isActive ? "success" : "neutral"}>
                      {macro.isActive ? "활성" : "비활성"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-app-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {macro.scheduleType === "interval"
                        ? `매 ${macro.intervalHours}시간마다`
                        : `매일 ${macro.fixedTime}`}
                    </span>
                    <span>일 {macro.maxSendsPerDay}회</span>
                    {macro.lastSentAt && <span>마지막: {formatDateTime(macro.lastSentAt)}</span>}
                  </div>
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleContentId(
                          visibleContentId === macro.id ? null : macro.id
                        )
                      }
                      className="flex-1 truncate text-left text-xs text-app-text-subtle hover:text-app-text transition-colors"
                      title={macro.messageContent}
                    >
                      {visibleContentId === macro.id
                        ? macro.messageContent
                        : macro.messageContent.length > 100
                          ? `${macro.messageContent.slice(0, 100)}...`
                          : macro.messageContent}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleContentId(
                          visibleContentId === macro.id ? null : macro.id
                        )
                      }
                      className="shrink-0 rounded p-0.5 text-app-text-subtle hover:text-app-text transition-colors"
                      aria-label={visibleContentId === macro.id ? "내용 숨기기" : "전체 내용 보기"}
                    >
                      {visibleContentId === macro.id ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyContent(macro.messageContent)}
                      className="shrink-0 rounded p-0.5 text-app-text-subtle hover:text-app-text transition-colors"
                      aria-label="내용 복사"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  {macro.targetChats.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {macro.targetChats.slice(0, 3).map((chat) => (
                        <span
                          key={chat}
                          className="rounded bg-app-card-hover px-1.5 py-0.5 text-[11px] text-app-text-muted"
                        >
                          {chat}
                        </span>
                      ))}
                      {macro.targetChats.length > 3 && (
                        <span className="text-[11px] text-app-text-subtle">
                          +{macro.targetChats.length - 3}개
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-0 sm:shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(macro)}
                    aria-label="매크로 수정"
                  >
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExecuteConfirmId(macro.id)}
                    aria-label="지금 실행"
                    className="text-app-success"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmDeleteId(macro.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="매크로 삭제"
        description="이 답장매크로를 정말 삭제하시겠습니까?"
        variant="danger"
        confirmLabel="삭제"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={!!executeConfirmId}
        title="매크로 즉시 실행"
        description="답장매크로를 지금 즉시 실행하시겠습니까?"
        confirmLabel="실행"
        onConfirm={handleConfirmExecute}
        onCancel={() => setExecuteConfirmId(null)}
      />
    </div>
  );
}
