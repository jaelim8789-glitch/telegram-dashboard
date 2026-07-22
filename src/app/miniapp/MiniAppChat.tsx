"use client";

import { useState, memo, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Sparkles, Loader2, Mic, MicOff, Bookmark, BookmarkCheck, ArrowRight, Copy, CheckCheck, Bot, Plus } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useToastStore } from "@/components/ui/GlobalToast";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { sendChatMessage, fetchChatMessages, fetchAgents, createChat } from "@/lib/agent-api";
import type { Agent, AgentChat, AgentMessage } from "@/lib/agent-api";

let hapticFeedback: any = null;
if (typeof window !== "undefined") {
  import("@tma.js/sdk-react").then(m => { hapticFeedback = m.hapticFeedback; }).catch(() => {});
}

interface Message { role: "user" | "agent"; content: string; id: string; bookmarked?: boolean; }

const QUICK_PROMPTS = [
  { label: "오늘 요약", prompt: "오늘 발송 현황 알려줘", icon: "📊" },
  { label: "계정 상태", prompt: "계정 건강 상태는?", icon: "❤️" },
  { label: "실패 분석", prompt: "최근 발송 실패한 거 있어?", icon: "❌" },
  { label: "발송 작성", prompt: "새 마케팅 카피 작성해줘", icon: "✍️" },
];

interface ChatHistory { messages: Message[]; chatId: string | null; agentId: string | null; }
const useChatStore = create<ChatHistory>()(persist(() => ({ messages: [], chatId: null, agentId: null }), { name: "telemon-miniapp-chat" }));

function getContextualGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "늦은 시간까지 고생하시네요! 오늘 발송 현황을 알려드릴까요?";
  if (h < 12) return "좋은 아침입니다! 오늘의 발송 현황을 확인해보세요.";
  if (h < 18) return "안녕하세요! TeleMon AI입니다. 무엇을 도와드릴까요?";
  return "저녁 시간입니다. 오늘 하루 발송 현황을 요약해드릴까요?";
}

const ChatBubble = memo(function ChatBubble({ msg, onCopy, onBookmark }: { msg: Message; onCopy: (text: string) => void; onBookmark: (id: string) => void }) {
  const isUser = msg.role === "user";
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className="relative max-w-[85%]">
        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
          style={{ backgroundColor: isUser ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-section-bg-color, #232e3c)", color: isUser ? "#fff" : "var(--tg-theme-text-color)" }}
          onContextMenu={e => { e.preventDefault(); setShowMenu(prev => !prev); }}>
          {msg.content}
        </div>
        {showMenu && (
          <div className="absolute top-full mt-1 z-10 rounded-xl p-1 shadow-lg" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
            <button onClick={() => { onCopy(msg.content); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]" style={{ color: "var(--tg-theme-text-color)" }}>
              <Copy className="h-3.5 w-3.5" /> 복사
            </button>
            <button onClick={() => { onBookmark(msg.id); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]" style={{ color: "var(--tg-theme-text-color)" }}>
              {msg.bookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" /> : <Bookmark className="h-3.5 w-3.5" />} 북마크
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-3 text-sm" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }}>
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "200ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

const SpeechRecognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

export const MiniAppChat = memo(function MiniAppChat() {
  const savedMessages = useChatStore(s => s.messages);
  const savedChatId = useChatStore(s => s.chatId);
  const savedAgentId = useChatStore(s => s.agentId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(savedChatId);
  const [agentId, setAgentId] = useState<string | null>(savedAgentId);
  const [initLoading, setInitLoading] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // 초기화: 에이전트 + 채팅 생성
  useEffect(() => {
    async function init() {
      try {
        let aid = agentId;
        if (!aid) {
          const agents = await fetchAgents();
          if (agents.length > 0) aid = agents[0].id;
          else {
            const demo = await fetch("/api/ai/agents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "TeleMon AI", role: "assistant",
                systemPrompt: "당신은 TeleMon 미니앱의 AI 어시스턴트입니다. 사용자의 질문에 간결하고 도움이 되는 답변을 한국어로 제공하세요. 발송 관련 질문이면 구체적으로 안내해주세요.",
              }),
            }).then(r => r.json()).catch(() => null);
            if (demo?.id) aid = demo.id;
          }
          if (aid) setAgentId(aid);
        }

        let cid = chatId;
        if (aid && !cid) {
          const chat = await createChat(aid, "미니앱 채팅");
          if (chat?.id) { cid = chat.id; setChatId(cid); }
        }

        if (cid) {
          const msgs = await fetchChatMessages(cid);
          if (msgs.length > 0) {
            setMessages(msgs.map(m => ({ role: m.role, content: m.content, id: m.id, bookmarked: false })));
          } else {
            setMessages([{ role: "agent", content: getContextualGreeting(), id: "welcome" }]);
          }
        } else {
          setMessages([{ role: "agent", content: getContextualGreeting(), id: "welcome" }]);
        }
      } catch { setMessages([{ role: "agent", content: "연결 중 오류가 발생했습니다. 다시 시도해주세요.", id: "welcome" }]); }
      setInitLoading(false);
    }
    init();
  }, []);

  // 상태 저장
  useEffect(() => { useChatStore.setState({ messages, chatId, agentId }); }, [messages, chatId, agentId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, id: `u-${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try { hapticFeedback?.notificationOccurred("success"); } catch {}

    try {
      // 1. 채팅이 없으면 생성
      let cid = chatId;
      if (!cid) {
        const aid = agentId;
        if (!aid) throw new Error("no agent");
        const chat = await createChat(aid, "미니앱 채팅");
        if (chat?.id) { cid = chat.id; setChatId(cid); }
        else throw new Error("chat creation failed");
      }

      // 2. 실제 API 호출 (DeepSeek → stream)
      const response = await sendChatMessage(cid, text);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 3. SSE 스트리밍 응답 처리
      const reader = response.body?.getReader();
      if (!reader) throw new Error("no reader");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.choices?.[0]?.delta?.content || parsed.content || "";
              if (chunk) accumulated += chunk;
            } catch {}
          }
        }

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "agent" && last.id.startsWith("stream-")) {
            return [...prev.slice(0, -1), { ...last, content: accumulated }];
          }
          return [...prev, { role: "agent", content: accumulated, id: `stream-${Date.now()}` }];
        });
      }

      // 스트리밍 완료 후 최종 메시지 확정
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id.startsWith("stream-")) {
          return [...prev.slice(0, -1), { role: "agent", content: last.content, id: `a-${Date.now()}` }];
        }
        return prev;
      });
    } catch (err) {
      useToastStore.getState().add({ type: "error", title: "AI 응답 실패", message: "다시 시도해주세요" });
      setMessages(prev => [...prev, { role: "agent", content: "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.", id: `a-${Date.now()}` }]);
    }
    setLoading(false);
  }, [loading, chatId, agentId]);

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); useToastStore.getState().add({ type: "success", title: "복사됨" }); } catch {}
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m));
    try { hapticFeedback?.impactOccurred("light"); } catch {}
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!SpeechRecognition) { useToastStore.getState().add({ type: "info", title: "이 브라우저는 음성 입력을 지원하지 않습니다" }); return; }
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; return; }
    try {
      const r = new SpeechRecognition();
      r.lang = "ko-KR"; r.interimResults = false;
      r.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); handleSend(t); };
      r.onend = () => { recognitionRef.current = null; };
      r.start(); recognitionRef.current = r;
      try { hapticFeedback?.impactOccurred("medium"); } catch {}
    } catch {}
  }, [handleSend]);

  const handleSendRedirect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab: "send" } }));
  }, []);

  const bookmarkedCount = useMemo(() => messages.filter(m => m.bookmarked).length, [messages]);

  if (initLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
        <p className="text-xs mt-2" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>AI 연결 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"><Sparkles className="h-4 w-4 text-white" /></div>
        <div className="flex-1"><h2 className="text-sm font-bold">AI 어시스턴트</h2><p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>DeepSeek AI · SSE 스트리밍</p></div>
        {bookmarkedCount > 0 && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
            <BookmarkCheck className="h-3 w-3 text-amber-400" /> {bookmarkedCount}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-label="채팅 메시지">
        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} onCopy={handleCopy} onBookmark={handleBookmark} />)}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 mb-3 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(q => (
              <button key={q.label} onClick={() => handleSend(q.prompt)} disabled={loading}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>
                <span>{q.icon}</span>{q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 shrink-0">
        <div className="flex gap-2">
          {SpeechRecognition && (
            <button onClick={handleVoiceToggle} className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95"
              style={{ backgroundColor: recognitionRef.current ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-section-bg-color, #232e3c)" }}
              aria-label="음성 입력">
              {recognitionRef.current ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color)" }} />}
            </button>
          )}
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="DeepSeek AI에 질문하세요..." autoComplete="off" aria-label="메시지 입력"
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color)", border: "1px solid var(--tg-theme-hint-color, #708499)" }} />
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }} aria-label="메시지 전송">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {messages.length <= 2 && (
        <button onClick={handleSendRedirect} className="mx-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium active:scale-[0.98]"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
          <Send className="h-3.5 w-3.5" /> 발송 탭으로 이동
        </button>
      )}
    </div>
  );
});
