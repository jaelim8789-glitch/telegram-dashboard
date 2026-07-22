"use client";

import { useState, memo, useEffect, useCallback, useMemo } from "react";
import { Send, Loader2, CheckCircle, Clock, History, Users, ChevronDown, AlertCircle } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import * as api from "@/lib/api";
import { quickSendToTopGroups } from "@/lib/api-miniapp";

interface MiniAppSendProps { user?: { id: number; first_name?: string; last_name?: string; username?: string }; }

const STORAGE_KEY = "telemon-miniapp-templates";
const RECENT_KEY = "telemon-miniapp-recent-recipients";

function loadTemplates(): string[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveTemplates(t: string[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t.slice(0, 5))); } catch {} }
function loadRecent(): string[] {
  try { const raw = localStorage.getItem(RECENT_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveRecent(r: string[]) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 10))); } catch {} }

export const MiniAppSend = memo(function MiniAppSend({ user }: MiniAppSendProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; phone: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loadingAccts, setLoadingAccts] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setTemplates(loadTemplates()); setRecents(loadRecent()); }, []);

  useEffect(() => {
    api.fetchAccounts().then(list => {
      const active = list.filter((a: any) => a.status === "active").map((a: any) => ({ id: a.id, phone: a.phone }));
      setAccounts(active);
      if (active.length > 0) setSelectedAccountId(active[0].id);
      setLoadingAccts(false);
    }).catch(() => setLoadingAccts(false));
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoadingGroups(true);
    api.fetchGroups(selectedAccountId).then((list: any[]) => {
      setGroups(list || []);
      setLoadingGroups(false);
    }).catch(() => { setGroups([]); setLoadingGroups(false); });
  }, [selectedAccountId]);

  const sendHandler = useCallback(async () => {
    if (!message.trim() || sending || !selectedAccountId) return;
    try { hapticFeedback.impactOccurred("medium"); } catch {}
    setSending(true);
    setError("");

    let result;
    if (selectedGroupIds.length > 0) {
      try {
        const { request } = await import("@/lib/api");
        await request("/api/broadcasts", {
          method: "POST",
          body: JSON.stringify({ account_id: selectedAccountId, message: message.trim(), group_ids: selectedGroupIds, delivery_mode: "normal" }),
        });
        result = { success: true, message: `${selectedGroupIds.length}개 그룹에 발송 완료!` };
      } catch (err) {
        result = { success: false, message: err instanceof Error ? err.message : "발송 실패" };
      }
    } else {
      result = await quickSendToTopGroups(selectedAccountId, message.trim(), 5);
    }

    if (result.success) {
      setSent(true); setMessage("");
      saveRecent([message, ...loadRecent().filter(r => r !== message)]);
      setRecents(loadRecent());
      try { hapticFeedback.notificationOccurred("success"); } catch {}
      setTimeout(() => setSent(false), 3000);
    } else {
      setError(result.message);
      try { hapticFeedback.notificationOccurred("error"); } catch {}
    }
    setSending(false);
  }, [message, sending, selectedAccountId, selectedGroupIds]);

  const saveAsTemplate = useCallback(() => {
    if (!message.trim()) return;
    saveTemplates([message, ...loadTemplates().filter(t => t !== message)]);
    setTemplates(loadTemplates());
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }, [message]);

  const applyTemplate = useCallback((t: string) => { setMessage(t); try { hapticFeedback.impactOccurred("light"); } catch {} }, []);

  const toggleGroup = useCallback((gid: string) => {
    setSelectedGroupIds(prev => prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid]);
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }, []);

  const currentAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  return (
    <div className="p-4 pb-8 space-y-3">
      <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>발송</p>

      {/* 계정 선택 */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color, #708499)" }}><Users className="h-3 w-3" /> 발송 계정</label>
        {loadingAccts ? (
          <div className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }} />
        ) : (
          <div className="relative">
            <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setSelectedGroupIds([]); }}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
              style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color, #f5f5f5)" }}
              aria-label="발송 계정 선택">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.phone}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
          </div>
        )}
      </div>

      {/* 그룹 선택 */}
      <div className="space-y-1">
        <button onClick={() => setShowGroupPicker(!showGroupPicker)} className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color, #f5f5f5)" }}
          aria-label={showGroupPicker ? "그룹 선택 닫기" : "그룹 선택 열기"}>
          <span>{selectedGroupIds.length > 0 ? `${selectedGroupIds.length}개 그룹 선택됨` : "그룹 선택 (선택사항)"}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGroupPicker ? "rotate-180" : ""}`} style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        </button>
        {showGroupPicker && (
          <div className="max-h-40 overflow-y-auto rounded-xl p-2" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
            {loadingGroups ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} /></div>
            ) : groups.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>발송 가능한 그룹이 없습니다</p>
            ) : (
              groups.map(g => (
                <button key={g.id} onClick={() => toggleGroup(g.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${selectedGroupIds.includes(g.id) ? "font-semibold" : ""}`}
                  style={{ backgroundColor: selectedGroupIds.includes(g.id) ? "var(--tg-theme-button-color, #5288c1)" : "transparent", color: selectedGroupIds.includes(g.id) ? "#fff" : "var(--tg-theme-text-color, #f5f5f5)" }}>
                  {g.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="보낼 메시지를 입력하세요" rows={5}
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color, #f5f5f5)" }}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" aria-label="발송할 메시지" />

      {/* 최근 메시지 */}
      {recents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium flex items-center gap-1 w-full" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            <History className="h-3 w-3" /> 최근
          </span>
          {recents.slice(0, 4).map((r, i) => (
            <button key={i} onClick={() => applyTemplate(r)} className="rounded-full px-3 py-1.5 text-[11px] truncate max-w-[140px] active:scale-95"
              style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>{r.slice(0, 18)}{r.length > 18 ? "..." : ""}</button>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <AlertCircle className="h-3.5 w-3.5 text-white" /><span className="text-white">{error}</span>
        </div>
      )}

      {/* 발송 버튼 */}
      <div className="flex gap-2">
        <button onClick={sendHandler} disabled={!message.trim() || sending || !selectedAccountId}
          style={{ backgroundColor: "var(--tg-theme-button-color, #40a7e3)", color: "var(--tg-theme-button-text-color, #fff)" }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold disabled:opacity-50 active:scale-[0.98]"
          aria-label={sending ? "발송 중" : sent ? "발송 완료" : "발송하기"}>
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : sent ? <CheckCircle className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          {sending ? "발송 중..." : sent ? "발송 완료!" : "발송하기"}
        </button>
        {message.trim() && !templates.includes(message) && (
          <button onClick={saveAsTemplate} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium active:scale-95"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }} aria-label="템플릿 저장">저장</button>
        )}
      </div>

      {/* 템플릿 */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium flex items-center gap-1 w-full" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            <Clock className="h-3 w-3" /> 템플릿
          </span>
          {templates.map((t, i) => (
            <button key={i} onClick={() => applyTemplate(t)} className="rounded-full px-3 py-1.5 text-[11px] truncate max-w-[140px] active:scale-95"
              style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>{t.slice(0, 18)}{t.length > 18 ? "..." : ""}</button>
          ))}
        </div>
      )}

      {selectedGroupIds.length === 0 && (
        <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
          그룹을 선택하지 않으면 상위 5개 그룹에 자동 발송됩니다
        </p>
      )}
    </div>
  );
});
