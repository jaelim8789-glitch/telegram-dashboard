"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import {
  fetchReplyMacros,
  createReplyMacro,
  updateReplyMacro,
  deleteReplyMacro,
  executeReplyMacro,
  fetchReplyMacroLogs,
  type ReplyMacroInput,
} from "@/lib/api";
import type { ReplyMacro, ReplyMacroLog } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { Play, RefreshCw, Trash2, Edit3, Clock, SendHorizonal, AlertCircle } from "lucide-react";

export function ReplyMacroInspector() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const [macros, setMacros] = useState<ReplyMacro[]>([]);
  const [logs, setLogs] = useState<ReplyMacroLog[]>([]);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetChats, setTargetChats] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [scheduleType, setScheduleType] = useState<"interval" | "fixed">("interval");
  const [intervalHours, setIntervalHours] = useState(24);
  const [fixedTime, setFixedTime] = useState("09:00");
  const [maxSendsPerDay, setMaxSendsPerDay] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAccount) loadMacros();
  }, [selectedAccount]);

  async function loadMacros() {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReplyMacros(selectedAccount.id);
      setMacros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로딩 실패");
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs(macroId: string) {
    if (!selectedAccount) return;
    setSelectedMacroId(macroId);
    try {
      const data = await fetchReplyMacroLogs(selectedAccount.id, macroId);
      setLogs(data);
    } catch {
      setLogs([]);
    }
  }

  function resetForm() {
    setName(""); setTargetChats(""); setMessageContent("");
    setScheduleType("interval"); setIntervalHours(24); setFixedTime("09:00"); setMaxSendsPerDay(10);
    setEditingId(null);
  }

  function startEdit(macro: ReplyMacro) {
    setEditingId(macro.id);
    setName(macro.name);
    setTargetChats(macro.targetChats.join("\n"));
    setMessageContent(macro.messageContent);
    setScheduleType(macro.scheduleType);
    setIntervalHours(macro.intervalHours);
    setFixedTime(macro.fixedTime || "09:00");
    setMaxSendsPerDay(macro.maxSendsPerDay);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
    setLoading(true); setError(null);
    const input: ReplyMacroInput = {
      name, targetChats: targetChats.split("\n").map((s) => s.trim()).filter(Boolean),
      messageContent, scheduleType, intervalHours,
      fixedTime: scheduleType === "fixed" ? fixedTime : undefined, maxSendsPerDay,
    };
    try {
      if (editingId) { await updateReplyMacro(selectedAccount.id, editingId, input); }
      else { await createReplyMacro(selectedAccount.id, input); }
      resetForm(); await loadMacros();
    } catch (err) { setError(err instanceof Error ? err.message : "저장 실패"); }
    finally { setLoading(false); }
  }

  async function handleDelete(macroId: string) {
    if (!selectedAccount) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteReplyMacro(selectedAccount.id, macroId);
      await loadMacros();
      if (selectedMacroId === macroId) { setSelectedMacroId(null); setLogs([]); }
    } catch (err) { setError(err instanceof Error ? err.message : "삭제 실패"); }
  }

  async function handleExecute(macroId: string) {
    if (!selectedAccount) return;
    try {
      await executeReplyMacro(selectedAccount.id, macroId);
      alert("답장매크로가 실행되었습니다.");
    } catch (err) { setError(err instanceof Error ? err.message : "실행 실패"); }
  }

  if (!selectedAccount) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-app-text-muted">계정을 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-app-text">답장매크로</h3>
        <Button variant="ghost" onClick={() => { resetForm(); loadMacros(); }} className="text-xs">
          <RefreshCw className="h-3 w-3" /> 새로고침
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-app-danger/20 bg-app-danger-muted px-3 py-2 text-xs text-app-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl border border-app-border bg-app-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-app-text-muted">
            {editingId ? "매크로 수정" : "새 매크로"}
          </span>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-[11px] text-app-primary hover:text-app-primary-hover"
            >
              취소
            </button>
          )}
        </div>
        <Field label="매크로 이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 아침 인사" required />
        </Field>
        <Field label="대상 채팅방 ID (한 줄에 하나씩)">
          <Textarea value={targetChats} onChange={(e) => setTargetChats(e.target.value)} rows={2} placeholder="chat_id_1" required />
        </Field>
        <Field label="메시지 내용">
          <Textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} rows={2} placeholder="보낼 메시지" required />
        </Field>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as "interval" | "fixed")}>
              <option value="interval">간격</option>
              <option value="fixed">고정 시간</option>
            </Select>
          </div>
          {scheduleType === "interval" ? (
            <div className="flex-1">
              <Input type="number" value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} min={1} />
            </div>
          ) : (
            <div className="flex-1">
              <Input type="time" value={fixedTime} onChange={(e) => setFixedTime(e.target.value)} />
            </div>
          )}
          <div className="w-20">
            <Input type="number" value={maxSendsPerDay} onChange={(e) => setMaxSendsPerDay(Number(e.target.value))} min={1} />
          </div>
        </div>
        <Button type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? "저장 중..." : editingId ? "수정 완료" : "매크로 추가"}
        </Button>
      </form>

      {/* Macro List */}
      <div className="space-y-1.5">
        {loading && macros.length === 0 && (
          <div className="space-y-1.5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {!loading && macros.length === 0 && (
          <EmptyState icon={SendHorizonal} title="등록된 매크로 없음" description="새 매크로를 추가하세요" />
        )}
        {macros.map((macro) => (
          <div
            key={macro.id}
            className={cn(
              "rounded-xl border p-3 transition-all",
              macro.isActive ? "border-app-border bg-app-card" : "border-app-border/30 bg-app-card/50 opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-app-text truncate">{macro.name}</span>
                  <Badge tone={macro.isActive ? "success" : "neutral"}>{macro.isActive ? "활성" : "비활성"}</Badge>
                </div>
                <div className="mt-1 text-xs text-app-text-muted">
                  <Clock className="mr-0.5 inline h-3 w-3" />
                  {macro.scheduleType === "interval" ? `매 ${macro.intervalHours}시간마다` : `매일 ${macro.fixedTime}`}
                  {" · "}일 {macro.maxSendsPerDay}회
                  {macro.lastSentAt && ` · 마지막: ${new Date(macro.lastSentAt).toLocaleString("ko-KR")}`}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-app-text-subtle">{macro.messageContent}</p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" onClick={() => startEdit(macro)} className="h-7 w-7 p-0">
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" onClick={() => handleExecute(macro.id)} className="h-7 w-7 p-0 text-app-success">
                  <Play className="h-3 w-3" />
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(macro.id)} className="h-7 w-7 p-0 text-app-danger">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Logs toggle */}
            <button
              onClick={() => loadLogs(macro.id)}
              className="mt-2 text-[11px] text-app-primary hover:text-app-primary-hover transition-colors"
            >
              로그 {selectedMacroId === macro.id ? `(${logs.length}건)` : "보기"}
            </button>

            {selectedMacroId === macro.id && (
              <div className="mt-2 max-h-28 space-y-0.5 overflow-y-auto rounded-lg bg-app-bg p-2">
                {logs.length === 0 && <p className="text-[11px] text-app-text-subtle">로그 없음</p>}
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-0.5 text-[11px]">
                    <span className="truncate text-app-text-muted">{log.targetChatId}</span>
                    <span className={log.status === "success" ? "text-app-success" : "text-app-danger"}>
                      {log.status === "success" ? "성공" : "실패"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
