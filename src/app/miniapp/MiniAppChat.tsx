"use client";

import { useState, memo, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Sparkles, Loader2, Mic, MicOff, Bookmark, BookmarkCheck, ArrowRight } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";

interface Message { role: "user" | "agent"; content: string; id: string; bookmarked?: boolean; }

const QUICK_PROMPTS = [
  { label: "오늘 요약", prompt: "오늘 발송 현황 알려줘" },
  { label: "계정 상태", prompt: "계정 건강 상태는?" },
  { label: "실패 분석", prompt: "최근 발송 실패한 거 있어?" },
  { label: "발송 작성", prompt: "새 마케팅 카피 작성해줘" },
];

const RESPONSES: Record<string, string> = {
  "오늘 발송": "오늘은 총 3건의 발송이 완료되었고, 1건이 대기 중입니다. 성공률은 97%입니다.",
  "계정 건강": "5개 계정 중 4개가 정상입니다. 1개 계정(***1234)이 속도 제한 상태입니다.",
  "발송 실패": "최근 24시간 동안 2건의 발송 실패가 있었습니다. 모두 네트워크 오류로 자동 재시도 예정입니다.",
  "마케팅 카피": "드디어 공개! 텔레그램 마케팅의 새로운 기준, TeleMon이 선보입니다. 지금 바로 시작하세요!",
};

function getContextualGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "늦은 시간까지 고생하시네요! 오늘 발송 현황을 알려드릴까요?";
  if (h < 12) return "좋은 아침입니다! 오늘의 발송 현황을 확인해보세요.";
  if (h < 18) return "안녕하세요! TeleMon AI입니다. 무엇을 도와드릴까요?";
  return "저녁 시간입니다. 오늘 하루 발송 현황을 요약해드릴까요?";
}

const ChatBubble = memo(function ChatBubble({ msg, onBookmark }: { msg: Message; onBookmark: (id: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className="relative max-w-[85%]">
        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
          style={{ backgroundColor: isUser ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-section-bg-color, #232e3c)", color: isUser ? "#fff" : "var(--tg-theme-text-color, #f5f5f5)" }}>
          {msg.content}
        </div>
        {!isUser && (
          <button onClick={() => onBookmark(msg.id)} className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1" aria-label={msg.bookmarked ? "북마크 해제" : "북마크"}>
            {msg.bookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" /> : <Bookmark className="h-3.5 w-3.5" style={{ color: "var(--tg-theme-hint-color)" }} />}
          </button>
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

export const MiniAppChat = memo(function MiniAppChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: getContextualGreeting(), id: "welcome" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, id: `u-${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try { hapticFeedback.notificationOccurred("success"); } catch {}
    setTimeout(() => {
      let reply = "죄송합니다. 다시 말씀해주시겠어요?";
      for (const [key, value] of Object.entries(RESPONSES)) { if (text.includes(key)) { reply = value; break; } }
      const agentMsg: Message = { role: "agent", content: reply, id: `a-${Date.now()}` };
      setMessages(prev => [...prev, agentMsg]);
      setLoading(false);
    }, 1000);
  }, [loading]);

  const handleSendRedirect = useCallback(() => {
    try { hapticFeedback.impactOccurred("light"); } catch {}
    window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab: "send" } }));
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
      recognition.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); handleSend(t); };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      try { hapticFeedback.impactOccurred("medium"); } catch {}
    } catch {}
  }, [listening, handleSend]);

  const bookmarkedCount = useMemo(() => messages.filter(m => m.bookmarked).length, [messages]);

  return (
    <div className="flex flex-col h-full pb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold">AI 어시스턴트</h2>
          <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>TeleMon AI와 대화하세요</p>
        </div>
        {bookmarkedCount > 0 && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
            <BookmarkCheck className="h-3 w-3 text-amber-400" /> {bookmarkedCount}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-label="채팅 메시지">
        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} onBookmark={handleBookmark} />)}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 mb-3 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(q => (
              <button key={q.label} onClick={() => handleSend(q.prompt)} disabled={loading}
                className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs transition-colors disabled:opacity-50 active:scale-95"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-button-color, #5288c1)" }}>
                <ArrowRight className="h-3 w-3 shrink-0" />{q.label}
              </button>
            ))}
          </div>
          <button onClick={handleSendRedirect}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium active:scale-[0.98]"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
            <Send className="h-3.5 w-3.5" /> 발송 탭으로 이동
          </button>
        </div>
      )}

      <div className="px-4 shrink-0">
        <div className="flex gap-2">
          <button onClick={handleVoiceToggle}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 transition-colors"
            style={{ backgroundColor: listening ? "var(--tg-theme-destructive-text-color, #ec3942)" : "var(--tg-theme-section-bg-color, #232e3c)" }}
            aria-label={listening ? "음성 입력 중지" : "음성 입력"}>
            {listening ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5" style={{ color: "var(--tg-theme-hint-color)" }} />}
          </button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="메시지를 입력하세요..." autoComplete="off" aria-label="메시지 입력"
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-text-color, #f5f5f5)", border: "1px solid var(--tg-theme-hint-color, #708499)" }} />
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }} aria-label="메시지 전송">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
});
