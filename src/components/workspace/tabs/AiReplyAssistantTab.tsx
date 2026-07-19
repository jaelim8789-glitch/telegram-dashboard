"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, Copy, Check, Loader2, MessageSquare } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { AiSubTabLayout } from "@/components/ai/AiSubTabLayout";

export function AiReplyAssistantTab() {
  const [accountId, setAccountId] = useState("");
  const [chatTitle, setChatTitle] = useState("");
  const [incomingMessage, setIncomingMessage] = useState("");
  const [suggestedReply, setSuggestedReply] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generateReply = async () => {
    if (!incomingMessage.trim() || loading) return;
    setLoading(true);
    setError("");
    setSuggestedReply("");

    try {
      const res = await fetch("/api/ai/reply-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId || "default",
          chat_id: "current",
          chat_title: chatTitle || undefined,
          incoming_message: incomingMessage,
          use_memory: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestedReply(data.suggested_reply);
        setConfidence(data.confidence);
        setReason(data.reason);
      } else {
        const err = await res.json().catch(() => ({ detail: "오류 발생" }));
        setError(err.detail || "답장 생성 실패");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(suggestedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AiSubTabLayout
      icon={<Bot className="h-5 w-5 text-app-primary" />}
      title="AI Reply Assistant"
      subtitle="문맥 기반 답장 추천"
      badge="NEW"
      error={error}
      empty={!suggestedReply && !loading}
      emptyFallback={
        <>
          <MessageSquare className="h-8 w-8 text-app-text-subtle mb-2" />
          <p className="text-xs text-app-text-muted">왼쪽에서 메시지를 입력하고</p>
          <p className="text-xs text-app-text-muted">AI 답장 추천을 받아보세요</p>
        </>
      }
    >

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Input */}
        <Panel title="들어온 메시지" className="h-full">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">계정 ID (선택)</label>
              <input type="text" value={accountId} onChange={e => setAccountId(e.target.value)}
                placeholder="계정 ID (비워두면 기본값)"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">채팅방 제목 (선택)</label>
              <input type="text" value={chatTitle} onChange={e => setChatTitle(e.target.value)}
                placeholder="채팅방 이름"
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-app-text-muted">들어온 메시지</label>
              <textarea value={incomingMessage} onChange={e => setIncomingMessage(e.target.value)}
                placeholder="답장이 필요한 메시지를 입력하세요..."
                rows={6}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary resize-none"
              />
            </div>
            <button onClick={generateReply} disabled={!incomingMessage.trim() || loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? "생성 중..." : "AI 답장 추천 받기"}
            </button>
          </div>
        </Panel>

        {/* Output */}
        <Panel title="AI 추천 답장" className="h-full">
          {suggestedReply ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  confidence >= 0.8 ? "bg-app-success-muted text-app-success" :
                  confidence >= 0.5 ? "bg-app-warning-muted text-app-warning" :
                  "bg-app-danger-muted text-app-danger"
                )}>
                  신뢰도: {(confidence * 100).toFixed(0)}%
                </div>
                {reason && (
                  <span className="text-[10px] text-app-text-muted truncate">{reason}</span>
                )}
              </div>

              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-xs text-app-text whitespace-pre-wrap">{suggestedReply}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={copyToClipboard}
                  className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-card-hover transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-app-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "복사됨" : "복사"}
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-app-primary px-3 py-1.5 text-xs text-white hover:bg-app-primary-hover transition-colors">
                  <Send className="h-3.5 w-3.5" /> 전송 (준비 중)
                </button>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </AiSubTabLayout>
  );
}