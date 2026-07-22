"use client";

import { useState, memo, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";

interface Message {
  role: "user" | "agent";
  content: string;
}

const QUICK_PROMPTS = [
  "오늘 발송 현황 알려줘",
  "계정 건강 상태는?",
  "최근 발송 실패한 거 있어?",
  "새 마케팅 카피 작성해줘",
];

const RESPONSES: Record<string, string> = {
  "오늘 발송": "오늘은 총 3건의 발송이 완료되었고, 1건이 대기 중입니다. 성공률은 97%입니다.",
  "계정 건강": "5개 계정 중 4개가 정상입니다. 1개 계정(***1234)이 속도 제한 상태입니다.",
  "발송 실패": "최근 24시간 동안 2건의 발송 실패가 있었습니다. 모두 네트워크 오류로 자동 재시도 예정입니다.",
  "마케팅 카피": "드디어 공개! 텔레그램 마케팅의 새로운 기준, TeleMon이 선보입니다. 지금 바로 시작하세요!",
};

export const MiniAppChat = memo(function MiniAppChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: "안녕하세요! TeleMon AI입니다. 무엇을 도와드릴까요?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      hapticFeedback.notificationOccurred("success");
    } catch {}

    setTimeout(() => {
      let reply = "죄송합니다. 다시 말씀해주시겠어요?";
      for (const [key, value] of Object.entries(RESPONSES)) {
        if (text.includes(key)) {
          reply = value;
          break;
        }
      }
      setMessages((prev) => [...prev, { role: "agent", content: reply }]);
      setLoading(false);
    }, 1000);
  }

  function handleQuickTap(prompt: string) {
    try { hapticFeedback.impactOccurred("light"); } catch {}
    handleSend(prompt);
  }

  return (
    <div className="flex flex-col h-full pb-4">
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold">AI 어시스턴트</h2>
          <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            TeleMon AI와 대화하세요
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-label="채팅 메시지">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={{
                backgroundColor:
                  msg.role === "user"
                    ? "var(--tg-theme-button-color, #5288c1)"
                    : "var(--tg-theme-section-bg-color, #232e3c)",
                color:
                  msg.role === "user"
                    ? "var(--tg-theme-button-text-color, #ffffff)"
                    : "var(--tg-theme-text-color, #f5f5f5)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm"
              style={{
                backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)",
                color: "var(--tg-theme-hint-color, #708499)",
              }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              답변 생성 중...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 mb-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickTap(prompt)}
                disabled={loading}
                className="rounded-full px-3 py-2 text-xs transition-opacity disabled:opacity-50 active:scale-95"
                style={{
                  backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)",
                  color: "var(--tg-theme-button-color, #5288c1)",
                }}
                aria-label={`빠른 질문: ${prompt}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)",
              color: "var(--tg-theme-text-color, #f5f5f5)",
              border: "1px solid var(--tg-theme-hint-color, #708499)",
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="false"
            aria-label="메시지 입력"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl active:scale-95"
            style={{
              backgroundColor: "var(--tg-theme-button-color, #5288c1)",
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}
            aria-label="메시지 전송"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
});
