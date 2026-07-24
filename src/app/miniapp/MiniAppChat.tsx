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
  { label: "?�늘 ?�약", prompt: "?�늘 발송 ?�황 ?�려�?, icon: "?��" },
  { label: "계정 ?�태", prompt: "계정 건강 ?�태??", icon: "?�️" },
  { label: "?�패 분석", prompt: "최근 발송 ?�패??�??�어?", icon: "?? },
  { label: "발송 ?�성", prompt: "??마�???카피 ?�성?�줘", icon: "?�️" },
];

interface ChatHistory { messages: Message[]; chatId: string | null; agentId: string | null; }
const useChatStore = create<ChatHistory>()(persist(() => ({ messages: [], chatId: null, agentId: null }), { name: "telemon-miniapp-chat" }));

function getContextualGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "??? ?�간까�? 고생?�시?�요! ?�늘 발송 ?�황???�려?�릴까요?";
  if (h < 12) return "좋�? ?�침?�니?? ?�늘??발송 ?�황???�인?�보?�요.";
  if (h < 18) return "?�녕?�세?? TeleMon AI?�니?? 무엇???��??�릴까요?";
  return "?�???�간?�니?? ?�늘 ?�루 발송 ?�황???�약?�드릴까??";
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
              {msg.bookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" /> : <Bookmark className="h-3.5 w-3.5" />} 북마??
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

declare global {
  interface Window { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any; }
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

  // 초기?? ?�이?�트 + 채팅 ?�성
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
                systemPrompt: "?�신?� TeleMon 미니?�의 AI ?�시?�턴?�입?�다. ?�용?�의 질문??간결?�고 ?��????�는 ?��????�국?�로 ?�공?�세?? 발송 관??질문?�면 구체?�으�??�내?�주?�요.",
              }),
            }).then(r => r.json()).catch(() => null);
            if (demo?.id) aid = demo.id;
          }
          if (aid) setAgentId(aid);
        }

        let cid = chatId;
        if (aid && !cid) {
          const chat = await createChat(aid, "미니??채팅");
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
      } catch { setMessages([{ role: "agent", content: "?�결 �??�류가 발생?�습?�다. ?�시 ?�도?�주?�요.", id: "welcome" }]); }
      setInitLoading(false);
    }
    init();
  }, []);

  // ?�태 ?�??
  useEffect(() => { useChatStore.setState({ messages, chatId, agentId }); }, [messages, chatId, agentId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, id: `u-${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try { hapticFeedback?.notificationOccurred("success"); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }

    try {
      // 1. 채팅???�으�??�성
      let cid = chatId;
      if (!cid) {
        const aid = agentId;
        if (!aid) throw new Error("no agent");
        const chat = await createChat(aid, "미니??채팅");
        if (chat?.id) { cid = chat.id; setChatId(cid); }
        else throw new Error("chat creation failed");
      }

      // 2. ?�제 API ?�출 (DeepSeek ??stream)
      const response = await sendChatMessage(cid, text);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 3. SSE ?�트리밍 ?�답 처리
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
            } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
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

      // ?�트리밍 ?�료 ??최종 메시지 ?�정
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id.startsWith("stream-")) {
          return [...prev.slice(0, -1), { role: "agent", content: last.content, id: `a-${Date.now()}` }];
        }
        return prev;
      });
    } catch (err) {
      useToastStore.getState().add({ type: "error", title: "AI ?�답 ?�패", message: "?�시 ?�도?�주?�요" });
      setMessages(prev => [...prev, { role: "agent", content: "죄송?�니?? ?�답???�성?�는 �??�류가 발생?�습?�다.", id: `a-${Date.now()}` }]);
    }
    setLoading(false);
  }, [loading, chatId, agentId]);

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); useToastStore.getState().add({ type: "success", title: "복사?? }); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m));
    try { hapticFeedback?.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!SpeechRecognition) { useToastStore.getState().add({ type: "info", title: "??브라?��????�성 ?�력??지?�하지 ?�습?�다" }); return; }
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; return; }
    try {
      const r = new SpeechRecognition();
      r.lang = "ko-KR"; r.interimResults = false;
      r.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); handleSend(t); };
      r.onend = () => { recognitionRef.current = null; };
      r.start(); recognitionRef.current = r;
      try { hapticFeedback?.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
    } catch (e) { console.warn('Unhandled error in MiniAppChat', e) }
  }, [handleSend]);

  const handleSendRedirect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab: "send" } }));
  }, []);

  const bookmarkedCount = useMemo(() => messages.filter(m => m.bookmarked).length, [messages]);

  if (initLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
        <p className="text-xs mt-2" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>AI ?�결 �?..</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"><Sparkles className="h-4 w-4 text-white" /></div>
        <div className="flex-1"><h2 className="text-sm font-bold">AI ?�시?�턴??/h2><p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>DeepSeek AI · SSE ?�트리밍</p></div>
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
              aria-label="?�성 ?�력">
              {recognitionRef.current ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color)" }} />}
            </button>
          )}
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="DeepSeek AI??질문?�세??.." autoComplete="off" aria-label="메시지 ?�력"
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color)", border: "1px solid var(--tg-theme-hint-color, #708499)" }} />
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }} aria-label="메시지 ?�송">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {messages.length <= 2 && (
        <button onClick={handleSendRedirect} className="mx-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium active:scale-[0.98]"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
          <Send className="h-3.5 w-3.5" /> 발송 ??���??�동
        </button>
      )}
    </div>
  );
});
