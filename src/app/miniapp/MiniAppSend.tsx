"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle } from "lucide-react";

interface MiniAppSendProps {
  user?: { id: number; first_name?: string; last_name?: string; username?: string };
}

export function MiniAppSend({ user }: MiniAppSendProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendHandler() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), targets: ["all"], mode: "normal" }),
      });
      if (res.ok) { 
        setSent(true); 
        setMessage(""); 
        setTimeout(() => setSent(false), 3000); 
      }
    } catch {}
    finally { setSending(false); }
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>
        빠른 발송
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="보낼 메시지를 입력하세요"
        rows={6}
        style={{
          backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
          color: "var(--tg-theme-text-color, #f5f5f5)",
        }}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck="false"
      />
      <button
        onClick={sendHandler}
        disabled={!message.trim() || sending}
        style={{
          backgroundColor: "var(--tg-theme-button-color, #40a7e3)",
          color: "var(--tg-theme-button-text-color, #fff)",
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold disabled:opacity-50 transition-opacity active:scale-98"
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : sent ? <CheckCircle className="h-5 w-5" /> : <Send className="h-5 w-5" />}
        {sending ? "발송 중..." : sent ? "발송 완료!" : "발송하기"}
      </button>
      <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
        전체 계정에 동시에 발송됩니다
      </p>
    </div>
  );
}