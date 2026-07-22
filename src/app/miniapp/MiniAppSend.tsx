"use client";

import { useState, memo, useEffect } from "react";
import { Send, Loader2, CheckCircle, Clock, History } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";

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
  const [templateName, setTemplateName] = useState("");

  useEffect(() => { setTemplates(loadTemplates()); setRecents(loadRecent()); }, []);

  async function sendHandler() {
    if (!message.trim() || sending) return;
    try { hapticFeedback.impactOccurred("medium"); } catch {}
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setSending(false);
    saveRecent([message, ...loadRecent().filter(r => r !== message)]);
    setRecents(loadRecent());
    try { hapticFeedback.notificationOccurred("success"); } catch {}
    setTimeout(() => setSent(false), 3000);
  }

  function saveAsTemplate() {
    if (!message.trim()) return;
    saveTemplates([message, ...loadTemplates().filter(t => t !== message)]);
    setTemplates(loadTemplates());
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }

  function applyTemplate(t: string) { setMessage(t); try { hapticFeedback.impactOccurred("light"); } catch {} }

  return (
    <div className="p-4 space-y-3 pb-8">
      <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>빠른 발송</p>

      {recents.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            <History className="h-3 w-3" /> 최근 발송한 메시지
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recents.slice(0, 3).map((r, i) => (
              <button key={i} onClick={() => applyTemplate(r)} className="rounded-full px-3 py-1.5 text-[11px] truncate max-w-[160px] transition-colors active:scale-95"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>{r.slice(0, 20)}{r.length > 20 ? "..." : ""}</button>
            ))}
          </div>
        </div>
      )}

      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="보낼 메시지를 입력하세요" rows={6}
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color, #f5f5f5)" }}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" autoFocus aria-label="발송할 메시지" />

      <div className="flex gap-2">
        <button onClick={sendHandler} disabled={!message.trim() || sending}
          style={{ backgroundColor: "var(--tg-theme-button-color, #40a7e3)", color: "var(--tg-theme-button-text-color, #fff)" }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold disabled:opacity-50 transition-opacity active:scale-[0.98]"
          aria-label={sending ? "발송 중" : sent ? "발송 완료" : "발송하기"}>
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : sent ? <CheckCircle className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          {sending ? "발송 중..." : sent ? "발송 완료!" : "발송하기"}
        </button>
        {message.trim() && !templates.includes(message) && (
          <button onClick={saveAsTemplate} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium active:scale-95"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }}
            aria-label="템플릿 저장">저장</button>
        )}
      </div>

      {templates.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            <Clock className="h-3 w-3" /> 저장된 템플릿
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)} className="rounded-full px-3 py-1.5 text-[11px] truncate max-w-[160px] transition-colors active:scale-95"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>{t.slice(0, 20)}{t.length > 20 ? "..." : ""}</button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>전체 계정에 동시에 발송됩니다</p>
    </div>
  );
});
