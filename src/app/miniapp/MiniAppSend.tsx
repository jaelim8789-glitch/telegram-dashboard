"use client";

import { useState, memo, useEffect, useCallback, useMemo, useRef } from "react";
import { Send, Loader2, CheckCircle, Clock, History, Users, ChevronDown, AlertCircle, Trash2, Calendar, Copy, X } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import * as api from "@/lib/api";
import { quickSendToTopGroups } from "@/lib/api-miniapp";

interface MiniAppSendProps { user?: { id: number; first_name?: string; last_name?: string; username?: string }; }

const STORAGE_KEY = "telemon-miniapp-templates";
const RECENT_KEY = "telemon-miniapp-recent-recipients";
const MAX_CHARS = 4096;

function loadTemplates(): string[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveTemplates(t: string[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t.slice(0, 5))); } catch {} }
function loadRecent(): string[] { try { const raw = localStorage.getItem(RECENT_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveRecent(r: string[]) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 10))); } catch {} }

export const MiniAppSend = memo(function MiniAppSend({ user }: MiniAppSendProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; phone: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loadingAccts, setLoadingAccts] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTemplates(loadTemplates()); setRecents(loadRecent()); }, []);

  useEffect(() => {
    api.fetchAccounts().then(list => {
      const active = list.filter((a: any) => a.status === "active").map((a: any) => ({ id: a.id, phone: a.phone }));
      setAccounts(active);
      if (active.length > 0) setSelectedAccountIds([active[0].id]);
      setLoadingAccts(false);
    }).catch(() => setLoadingAccts(false));
  }, []);

  useEffect(() => {
    const aid = selectedAccountIds[0];
    if (!aid) return;
    setLoadingGroups(true);
    api.fetchGroups(aid).then((list: any[]) => {
      setGroups(list || []);
      setLoadingGroups(false);
    }).catch(() => { setGroups([]); setLoadingGroups(false); });
  }, [selectedAccountIds]);

  const toggleAccount = useCallback((id: string) => {
    setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }, []);

  const sendHandler = useCallback(async () => {
    if (!message.trim() || sending || selectedAccountIds.length === 0) return;
    try { hapticFeedback.impactOccurred("medium"); } catch {}
    setSending(true); setError(""); setShowConfirm(false);
    let success = true;
    for (const accountId of selectedAccountIds) {
      try {
        if (selectedGroupIds.length > 0) {
          const { request } = await import("@/lib/api");
          await request("/api/broadcasts", {
            method: "POST",
            body: JSON.stringify({ account_id: accountId, message: message.trim(), group_ids: selectedGroupIds, delivery_mode: "normal", scheduled_at: isScheduled && scheduledAt ? scheduledAt : undefined }),
          });
        } else {
          const result = await quickSendToTopGroups(accountId, message.trim(), 5);
          if (!result.success) { setError(`${accountId.slice(0, 8)}: ${result.message}`); success = false; break; }
        }
      } catch (err) { setError(err instanceof Error ? err.message : "발송 실패"); success = false; break; }
    }
    if (success) {
      setSent(true);
      saveRecent([message, ...loadRecent().filter(r => r !== message)]);
      setRecents(loadRecent());
      try { hapticFeedback.notificationOccurred("success"); } catch {}
      setTimeout(() => setSent(false), 3000);
    } else { try { hapticFeedback.notificationOccurred("error"); } catch {} }
    setSending(false);
  }, [message, sending, selectedAccountIds, selectedGroupIds, isScheduled, scheduledAt]);

  const saveAsTemplate = useCallback(() => {
    if (!message.trim()) return;
    saveTemplates([message, ...loadTemplates().filter(t => t !== message)]);
    setTemplates(loadTemplates());
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }, [message]);

  const deleteTemplate = useCallback((t: string) => {
    saveTemplates(loadTemplates().filter(x => x !== t));
    setTemplates(loadTemplates());
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }, []);

  const applyTemplate = useCallback((t: string) => { setMessage(t); try { hapticFeedback.impactOccurred("light"); } catch {} }, []);
  const toggleGroup = useCallback((gid: string) => { setSelectedGroupIds(prev => prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid]); try { hapticFeedback.impactOccurred("light"); } catch {} }, []);

  const remaining = MAX_CHARS - message.length;
  const remainingColor = remaining > 500 ? "var(--tg-theme-hint-color, #708499)" : remaining > 100 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-4 pb-8 space-y-3">
      <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>발송</p>

      {/* 계정 선택 (멀티) */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color, #708499)" }}><Users className="h-3 w-3" /> 발송 계정 ({selectedAccountIds.length}개 선택)</label>
        {loadingAccts ? (
          <div className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }} />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {accounts.map(a => (
              <button key={a.id} onClick={() => toggleAccount(a.id)}
                className="rounded-full px-3 py-2 text-[11px] font-medium transition-colors active:scale-95"
                style={{ backgroundColor: selectedAccountIds.includes(a.id) ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-secondary-bg-color, #232e3c)", color: selectedAccountIds.includes(a.id) ? "#fff" : "var(--tg-theme-text-color)" }}>
                {a.phone}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 그룹 선택 */}
      <div className="space-y-1">
        <button onClick={() => setShowGroupPicker(!showGroupPicker)} className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm active:scale-[0.98]"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}>
          <span>{selectedGroupIds.length > 0 ? `${selectedGroupIds.length}개 그룹 선택됨` : "그룹 선택 (선택사항)"}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGroupPicker ? "rotate-180" : ""}`} style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        </button>
        {showGroupPicker && (
          <div className="max-h-40 overflow-y-auto rounded-xl p-2" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
            {loadingGroups ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} /></div>
            : groups.length === 0 ? <p className="text-xs py-3 text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>발송 가능한 그룹이 없습니다</p>
            : groups.map(g => (
              <button key={g.id} onClick={() => toggleGroup(g.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${selectedGroupIds.includes(g.id) ? "font-semibold" : ""}`}
                style={{ backgroundColor: selectedGroupIds.includes(g.id) ? "var(--tg-theme-button-color, #5288c1)" : "transparent", color: selectedGroupIds.includes(g.id) ? "#fff" : "var(--tg-theme-text-color)" }}>
                <span className={`flex h-2 w-2 rounded-full ${selectedGroupIds.includes(g.id) ? "bg-white" : "bg-gray-500"}`} />
                {g.title}
              </button>
            ))}
            {selectedGroupIds.length > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
                {groups.filter(g => selectedGroupIds.includes(g.id)).map(g => (
                  <div key={g.id} className="flex items-center justify-between px-2 py-1 text-[11px]" style={{ color: "var(--tg-theme-text-color)" }}>
                    <span className="truncate">{g.title}</span>
                    <X className="h-3 w-3 shrink-0 cursor-pointer" style={{ color: "var(--tg-theme-hint-color, #708499)" }} onClick={() => toggleGroup(g.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <div className="relative">
        <textarea ref={textareaRef} value={message} onChange={e => setMessage(e.target.value)} placeholder="보낼 메시지를 입력하세요" rows={5} maxLength={MAX_CHARS}
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" aria-label="발송할 메시지" />
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          <span className="text-[10px] font-medium" style={{ color: remainingColor }}>{remaining}</span>
          <button onClick={() => { navigator.clipboard.writeText(message); try { hapticFeedback.impactOccurred("light"); } catch {} }}
            className="rounded-lg p-1 hover:bg-white/10 transition-colors" aria-label="복사"><Copy className="h-3.5 w-3.5" style={{ color: "var(--tg-theme-hint-color, #708499)" }} /></button>
        </div>
      </div>

      {/* 예약 발송 */}
      <div className="flex items-center gap-2">
        <button onClick={() => setIsScheduled(!isScheduled)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium active:scale-95 transition-colors"
          style={{ backgroundColor: isScheduled ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-section-bg-color, #232e3c)", color: isScheduled ? "#fff" : "var(--tg-theme-hint-color, #708499)" }}>
          <Calendar className="h-3.5 w-3.5" /> 예약 발송
        </button>
        {isScheduled && (
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-[11px] outline-none"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }} />
        )}
      </div>

      {/* 최근 메시지 */}
      {message.length === 0 && recents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium flex items-center gap-1 w-full" style={{ color: "var(--tg-theme-hint-color, #708499)" }}><History className="h-3 w-3" /> 최근</span>
          {recents.slice(0, 4).map((r, i) => (
            <button key={i} onClick={() => applyTemplate(r)} className="rounded-full px-3 py-1.5 text-[11px] truncate max-w-[140px] active:scale-95"
              style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>{r.slice(0, 18)}{r.length > 18 ? "..." : ""}</button>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <span className="text-white">{error}</span>
          <button onClick={() => setError("")} className="text-white/80"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* 발송 버튼 */}
      <div className="flex gap-2">
        <button onClick={() => setShowConfirm(true)} disabled={!message.trim() || sending || selectedAccountIds.length === 0}
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold disabled:opacity-50 active:scale-[0.98]"
          aria-label={sending ? "발송 중" : sent ? "발송 완료" : "발송하기"}>
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : sent ? <CheckCircle className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          {sending ? "발송 중..." : sent ? "발송 완료!" : `발송 (${selectedAccountIds.length}개 계정)`}
        </button>
        {message.trim() && !templates.includes(message) && (
          <button onClick={saveAsTemplate} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium active:scale-95"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }} aria-label="템플릿 저장">저장</button>
        )}
      </div>

      {/* Confirm 다이얼로그 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowConfirm(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-md rounded-t-2xl p-5 pb-8" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)" }}
            onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--tg-theme-hint-color, #708499)" }} />
            <h3 className="text-base font-bold mb-2">발송 확인</h3>
            <p className="text-sm mb-1" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
              {selectedAccountIds.length}개 계정 · {selectedGroupIds.length || "상위 5개"}개 그룹
            </p>
            <p className="text-xs rounded-xl px-3 py-2 mb-4 line-clamp-3" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}>{message}</p>
            {isScheduled && scheduledAt && (
              <p className="text-[11px] mb-3 flex items-center gap-1" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>
                <Calendar className="h-3 w-3" /> {new Date(scheduledAt).toLocaleString("ko-KR")} 예약
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl px-4 py-3 text-sm font-medium active:scale-[0.98]"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }}>취소</button>
              <button onClick={sendHandler} className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-[0.98]"
                style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>발송하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium flex items-center gap-1 w-full" style={{ color: "var(--tg-theme-hint-color, #708499)" }}><Clock className="h-3 w-3" /> 템플릿</span>
          {templates.map((t, i) => (
            <div key={i} className="flex items-center gap-0.5 rounded-full" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
              <button onClick={() => applyTemplate(t)} className="pl-3 py-1.5 text-[11px] truncate max-w-[120px] active:scale-95" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>{t.slice(0, 16)}{t.length > 16 ? "..." : ""}</button>
              <button onClick={() => deleteTemplate(t)} className="pr-2 py-1.5 active:scale-95" aria-label="템플릿 삭제"><Trash2 className="h-3 w-3" style={{ color: "var(--tg-theme-hint-color, #708499)" }} /></button>
            </div>
          ))}
        </div>
      )}

      {selectedGroupIds.length === 0 && (
        <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>그룹을 선택하지 않으면 상위 5개 그룹에 자동 발송됩니다</p>
      )}
    </div>
  );
});
