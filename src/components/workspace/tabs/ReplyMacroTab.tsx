"use client";

import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import { SendHorizonal, Plus, X, Search, RotateCcw, Copy, Play, Clock } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountCache, useRuntimeActions } from "@/lib/useAccountCache";
import {
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
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/Toast";

import { formatDateTime } from "@/lib/formatTime";

function getValidationErrors(name: string, targetChats: string, messageContent: string, maxSendsPerDay: number) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "매크로 이름을 입력하세요";
  if (!targetChats.trim()) errors.targetChats = "대상 채팅방을 입력하세요";
  if (!messageContent.trim()) errors.messageContent = "메시지 내용을 입력하세요";
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
  const [macroFile, setMacroFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [executeConfirmId, setExecuteConfirmId] = useState<string | null>(null);

  // ── New features ──
  const [searchQuery, setSearchQuery] = useState("");

  const formRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);

  const { toast } = useToast();

  // ── RuntimeManager 캐시에서 ReplyMacro 데이터 즉시 로드 ──
  const { replyMacros } = useAccountCache(selectedAccountId);
  const runtimeActions = useRuntimeActions();

  useEffect(() => {
    setSearchQuery("");
    if (selectedAccountId) {
      const cachedMacros = replyMacros;
      if (cachedMacros.length > 0) {
        setMacros(cachedMacros);
        setLoading(false);
      } else {
        // 이전 계정의 데이터를 즉시 지우고 로딩 상태 표시
        setMacros([]);
        setLoading(true);
        runtimeActions.refreshReplyMacros(selectedAccountId);
      }
    } else {
      setMacros([]);
      setLoading(false);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // 캐시가 업데이트되면 macros 동기화
  useEffect(() => {
    if (replyMacros.length > 0) {
      setMacros(replyMacros);
      setLoading(false);
    }
  }, [replyMacros]);

  // ── Filtered macros ──
  const filteredMacros = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return macros;
    return macros.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.messageContent.toLowerCase().includes(q)
    );
  }, [macros, searchQuery]);

  function resetForm() {
    setName("");
    setTargetChats("");
    setMessageContent("");
    setScheduleType("interval");
    setIntervalHours(24);
    setFixedTime("09:00");
    setMaxSendsPerDay(10);
    setMacroFile(null);
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

  function openDuplicateForm(macro: ReplyMacro) {
    resetForm();
    setName(macro.name + " (사본)");
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
      file: macroFile ?? undefined,
    };
    try {
      if (editingId) {
        await updateReplyMacro(selectedAccountId, editingId, input);
        toast("success", "매크로가 수정되었습니다");
      } else {
        await createReplyMacro(selectedAccountId, input);
        toast("success", "매크로가 추가되었습니다");
      }
      closeForm();
      await runtimeActions.refreshReplyMacros(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "저장 실패");
      toast("error", "매크로 저장에 실패했습니다");
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  async function handleConfirmDelete() {
    if (!selectedAccountId || !confirmDeleteId) return;
    try {
      await deleteReplyMacro(selectedAccountId, confirmDeleteId);
      await runtimeActions.refreshReplyMacros(selectedAccountId);
      toast("success", "매크로가 삭제되었습니다");
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
      toast("error", "매크로 삭제에 실패했습니다");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleConfirmExecute() {
    if (!selectedAccountId || !executeConfirmId) return;
    try {
      await executeReplyMacro(selectedAccountId, executeConfirmId);
      toast("success", "매크로가 즉시 실행되었습니다");
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
      toast("error", "매크로 실행에 실패했습니다");
    } finally {
      setExecuteConfirmId(null);
    }
  }

  function handleCopyContent(content: string) {
    navigator.clipboard.writeText(content).then(
      () => toast("success", "메시지 내용이 복사되었습니다"),
      () => toast("error", "클립보드 복사에 실패했습니다")
    );
  }

  if (!account) {
    return (
      <Panel title="답장매크로">
        <p className="text-sm text-app-text-muted">사이드바에서 계정을 선택하세요</p>
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-app-text">답장매크로</h2>
          <p className="text-xs text-app-text-muted">{getAccountDisplayName(account)}</p>
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" onClick={openCreateForm} className="shrink-0">
            <Plus className="h-3.5 w-3.5" /> 새 매크로
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-app-danger-muted px-4 py-3 text-xs text-app-danger">{error}</div>
      )}

      {/* Search */}
      {!loading && macros.length > 0 && (
        <div className="relative">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="매크로 이름 / 내용 검색"
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
      )}

      {loading && macros.length === 0 && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* Empty: no macros */}
      {!loading && !error && macros.length === 0 && !showForm && !searchQuery && (
        <EmptyState
          icon={SendHorizonal}
          title="등록된 매크로 없음"
          description="답장매크로는 특정 채팅방에 정해진 시간/간격으로 메시지를 전송합니다"
        >
          <Button variant="primary" size="sm" onClick={openCreateForm}>
            <Plus className="h-3.5 w-3.5" /> 첫 매크로 추가
          </Button>
        </EmptyState>
      )}

      {/* Empty: search no results */}
      {!loading && !error && macros.length > 0 && filteredMacros.length === 0 && !showForm && (
        <EmptyState
          icon={Search}
          title="검색 결과가 없습니다"
          description={`"${searchQuery}"와 일치하는 매크로가 없습니다`}
        >
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
            <RotateCcw className="h-3.5 w-3.5" /> 검색 초기화
          </Button>
        </EmptyState>
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
              className="rounded-lg p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
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
                autoComplete="off"
              />
            </Field>

            <Field
              label="대상 채팅방 ID"
              hint="채팅방 ID (숫자) 또는 @username, 한 줄에 하나씩 또는 쉼표로 구분"
              error={validationErrors.targetChats}
            >
              <Textarea
                value={targetChats}
                onChange={(e) => setTargetChats(e.target.value)}
                rows={5}
                placeholder="chat_id_1, chat_id_2&#10;또는 한 줄에 하나씩"
                invalid={!!validationErrors.targetChats}
              />
            </Field>

            <Field label="메시지 내용" error={validationErrors.messageContent}>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
                placeholder="보낼 메시지를 입력하세요"
                invalid={!!validationErrors.messageContent}
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-app-text-subtle">텔레그램 최대 4096자</span>
                <span className="text-[11px] text-app-text-muted">{messageContent.length}/4096</span>
              </div>
            </Field>

            <Field label="파일 첨부 (선택)">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                onChange={(e) => setMacroFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-app-text-muted file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-card file:px-2.5 file:py-1.5 file:text-app-text" />
              {macroFile && (
                <span className="mt-1 block text-[11px] text-app-text-muted">{macroFile.name}</span>
              )}
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
                    inputMode="numeric"
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
                  inputMode="numeric"
                />
              </Field>
            </div>

            {submitError && (
              <div className="rounded-lg bg-app-danger-muted px-3 py-2 text-xs text-app-danger">{submitError}</div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={closeForm}>취소</Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {editingId ? "수정 완료" : "매크로 추가"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Macro list - compact operational rows */}
      {filteredMacros.length > 0 && (
        <div className="space-y-1.5">
          {filteredMacros.map((macro) => (
            <div
              key={macro.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all sm:flex-row sm:items-center sm:gap-3",
                macro.isActive
                  ? "border-app-border bg-app-card"
                  : "border-app-border/30 bg-app-card/50 opacity-60"
              )}
            >
              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-app-text truncate max-w-[160px]" title={macro.name}>{macro.name}</span>
                  <Badge tone={macro.isActive ? "success" : "neutral"} className="shrink-0 text-[10px]">
                    {macro.isActive ? "반복 중" : "비활성"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-app-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {macro.scheduleType === "interval"
                      ? `매 ${macro.intervalHours}시간마다`
                      : `매일 ${macro.fixedTime}`}
                  </span>
                  <span>일 {macro.maxSendsPerDay}회</span>
                  {macro.lastSentAt && <span>마지막: {formatDateTime(macro.lastSentAt)}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[11px] text-app-text-muted flex-1 min-w-0" title={macro.messageContent}>
                    {macro.messageContent.length > 80 ? macro.messageContent.slice(0, 80) + "..." : macro.messageContent}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyContent(macro.messageContent)}
                    className="shrink-0 rounded p-0.5 text-app-text-subtle hover:text-app-text transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
                    aria-label="메시지 내용 복사"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {macro.targetChats.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {macro.targetChats.slice(0, 3).map((chat) => (
                      <span
                        key={chat}
                        className="rounded bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-text-muted truncate max-w-[100px]"
                        title={chat}
                      >
                        {chat}
                      </span>
                    ))}
                    {macro.targetChats.length > 3 && (
                      <span className="text-[10px] text-app-text-subtle">
                        +{macro.targetChats.length - 3}개
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Right: actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(macro)}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px]"
                  aria-label="매크로 수정"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => openDuplicateForm(macro)}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[32px]"
                  title="매크로 복제"
                >
                  복제
                </button>
                <button
                  type="button"
                  onClick={() => setExecuteConfirmId(macro.id)}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-success hover:bg-app-success-muted transition-colors min-h-[32px]"
                  aria-label="지금 실행"
                >
                  <Play className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(macro.id)}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted transition-colors min-h-[32px]"
                >
                  삭제
                </button>
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