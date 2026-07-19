"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Bot, User, Trash2, Plus, Sparkles, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface ChatSession {
  session_id: string;
  first_message: string;
  last_message: string;
  message_count: number;
}

export function AiChatTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const listSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/ai/chat/sessions");
      if (res.ok) setSessions(await res.json());
    } catch {} finally { setSessionsLoading(false); }
  }, []);

  const loadHistory = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/chat/history/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { listSessions(); }, [listSessions]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          session_id: activeSessionId,
          use_memory: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        if (!activeSessionId) {
          setActiveSessionId(data.session_id);
          listSessions();
        }
      } else {
        const err = await res.json().catch(() => ({ detail: "오류 발생" }));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.detail || "응답 실패"}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ 네트워크 오류가 발생했습니다." }]);
    } finally { setLoading(false); }
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    loadHistory(sessionId);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sessions sidebar */}
      <div className="w-56 shrink-0 space-y-2">
        <button onClick={startNewSession}
          className="flex w-full items-center gap-2 rounded-xl bg-app-primary px-3 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">
          <Plus className="h-3.5 w-3.5" /> 새 대화
        </button>
        <div className="space-y-1">
          {sessionsLoading ? (
            <p className="text-xs text-app-text-muted px-2">로딩 중...</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-app-text-muted px-2">대화 기록이 없습니다</p>
          ) : (
            sessions.map(s => (
              <button key={s.session_id} onClick={() => selectSession(s.session_id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-xs transition-colors",
                  activeSessionId === s.session_id
                    ? "bg-app-primary-muted text-app-primary font-medium"
                    : "text-app-text hover:bg-app-card-hover"
                )}>
                <p className="truncate font-medium">
                  {s.message_count > 0 ? `${s.message_count}개 메시지` : "빈 대화"}
                </p>
                <p className="text-[10px] text-app-text-muted truncate mt-0.5">
                  {new Date(s.last_message).toLocaleDateString("ko-KR")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-2xl border border-app-border bg-app-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-app-border px-4 py-2.5">
          <Bot className="h-4 w-4 text-app-primary" />
          <span className="text-xs font-semibold text-app-text">AI Chat</span>
          <Sparkles className="h-3 w-3 text-app-warning" />
          <span className="text-[10px] text-app-text-muted ml-auto">
            {activeSessionId ? "메모리 활성화" : "새 대화"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bot className="h-10 w-10 text-app-text-subtle mb-3" />
              <p className="text-sm font-medium text-app-text">무엇을 도와드릴까요?</p>
              <p className="text-xs text-app-text-muted mt-1">TeleMon 운영에 대한 질문을 자유롭게 물어보세요</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-primary-muted">
                  <Bot className="h-3.5 w-3.5 text-app-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-app-primary text-white rounded-br-md"
                  : "bg-app-bg text-app-text rounded-bl-md border border-app-border"
              )}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-primary">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-primary-muted">
                <Bot className="h-3.5 w-3.5 text-app-primary" />
              </div>
              <div className="rounded-xl bg-app-bg px-3 py-2 border border-app-border">
                <Loader2 className="h-4 w-4 animate-spin text-app-text-muted" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-app-border p-3">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary transition-colors"
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="flex items-center gap-1 rounded-xl bg-app-primary px-3 py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}