"use client";

import { useState, memo, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Sparkles, Loader2, Mic, MicOff, Bookmark, BookmarkCheck, ArrowRight, Copy, CheckCheck } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Message { role: "user" | "agent"; content: string; id: string; bookmarked?: boolean; }

const QUICK_PROMPTS = [
  { label: "오늘 요약", prompt: "오늘 발송 현황 알려줘" },
  { label: "계정 상태", prompt: "계정 건강 상태는?" },
  { label: "실패 분석", prompt: "최근 발송 실패한 거 있어?" },
  { label: "발송 작성", prompt: "새 마케팅 카피 작성해줘" },
];

interface ChatHistory { messages: Message[]; }
const useChatStore = create<ChatHistory>()(persist(() => ({ messages: [] }), { name: "telemon-miniapp-chat" }));

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
            {!isUser && <button onClick={() => { onBookmark(msg.id); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)]" style={{ color: "var(--tg-theme-text-color)" }}>
              {msg.bookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" /> : <Bookmark className="h-3.5 w-3.5" />} 북마크
            </button>}
          </div>
        )}
        {!isUser && msg.bookmarked && <BookmarkCheck className="absolute -right-5 top-1 h-3.5 w-3.5 text-amber-400" />}
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

async function callDeepSeek(messages: { role: string; content: string }[]): Promise<string> {
  try {
    const res = await fetch("/api/miniapp/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.reply || "죄송합니다. 다시 말해주시겠어요?";
  } catch {
    return "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export const MiniAppChat = memo(function MiniAppChat() {
  const savedMessages = useChatStore(s => s.messages);
  const saveMessages = useChatStore(s => s);
  const [messages, setMessages] = useState<Message[]>(() => savedMessages.length > 0 ? savedMessages : [{ role: "agent", content: getContextualGreeting(), id: "welcome" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [continuousVoice, setContinuousVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { saveMessages.messages = messages; }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, id: `u-${Date.now()}` };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try { hapticFeedback.notificationOccurred("success"); } catch {}

    const reply = await callDeepSeek(updatedMessages.map(m => ({ role: m.role, content: m.content })));

    // <ACTION> 태그 파싱하여 발송탭 이동
    const actionMatch = reply.match(/<ACTION>(.*?)<\/ACTION>/s);
    let finalReply = reply.replace(/<ACTION>.*?<\/ACTION>/s, "").trim();
    setMessages(prev => [...prev, { role: "agent", content: finalReply, id: `a-${Date.now()}` }]);
    setLoading(false);

    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);
        if (action.type === "redirect_send" && action.message) {
          localStorage.setItem("telemon-miniapp-pending-message", action.message);
          setTimeout(() => window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab: "send" } })), 500);
        }
      } catch {}
    }
  }, [messages, loading]);

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(text.slice(0, 10)); setTimeout(() => setCopiedId(""), 2000); try { hapticFeedback.impactOccurred("light"); } catch {} } catch {}
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m));
    try { hapticFeedback.impactOccurred("light"); } catch {}
  }, []);

  const handleVoiceToggle = useCallback(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.continuous = continuousVoice;
      recognition.onresult = (e: any) => { const t = e.results[e.results.length - 1][0].transcript; setInput(t); if (!continuousVoice) handleSend(t); };
      recognition.onend = () => { if (continuousVoice) try { recognition.start(); } catch {} else setListening(false); };
      recognitionRef.current = recognition; recognition.start(); setListening(true);
      try { hapticFeedback.impactOccurred("medium"); } catch {}
    } catch {}
  }, [listening, continuousVoice, handleSend]);

  const handleSendRedirect = useCallback(() => {
    try { hapticFeedback.impactOccurred("light"); } catch {}
    window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab: "send" } }));
  }, []);

  const bookmarkedCount = useMemo(() => messages.filter(m => m.bookmarked).length, [messages]);

  return (
    <div className="flex flex-col h-full pb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"><Sparkles className="h-4 w-4 text-white" /></div>
        <div className="flex-1"><h2 className="text-sm font-bold">AI 어시스턴트</h2><p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>DeepSeek AI 기반</p></div>
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
                className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>
                <ArrowRight className="h-3 w-3 shrink-0" />{q.label}
              </button>
            ))}
          </div>
          <button onClick={handleSendRedirect} className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium active:scale-[0.98]"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
            <Send className="h-3.5 w-3.5" /> 발송 탭으로 이동
          </button>
        </div>
      )}

      <div className="px-4 shrink-0 space-y-2">
        <div className="flex gap-2">
          <button onClick={handleVoiceToggle} className="relative flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 transition-colors"
            style={{ backgroundColor: listening ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-section-bg-color, #232e3c)" }}
            aria-label={listening ? "음성 입력 중지" : "음성 입력"}>
            {listening ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color)" }} />}
          </button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="메시지를 입력하세요..." autoComplete="off" aria-label="메시지 입력"
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color)", border: "1px solid var(--tg-theme-hint-color, #708499)" }} />
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }} aria-label="메시지 전송">
            {copiedId ? <CheckCheck className="h-5 w-5 text-white" /> : <Send className="h-5 w-5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
});
