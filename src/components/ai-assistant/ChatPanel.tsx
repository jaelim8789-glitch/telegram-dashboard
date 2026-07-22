"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { MOCK_CHAT_HISTORY, MOCK_SUGGESTED_QUESTIONS } from "./mockData";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatInputBar } from "./ChatInputBar";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { ChatMessage } from "./types";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowSuggestions(false);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: getMockResponse(text),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 800);
  }, [input]);

  const handleSuggestedQuestion = useCallback((text: string) => {
    setInput(text);
    setShowSuggestions(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: getMockResponse(text),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 800);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-app-border px-5 py-3">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-app-card bg-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-app-text">AI 비서</p>
          <p className="text-xs text-green-400">온라인</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {showSuggestions && messages.length === 0 ? (
          <SuggestedQuestions questions={MOCK_SUGGESTED_QUESTIONS} onSelect={handleSuggestedQuestion} />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-app-border px-5 py-3">
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder="AI 비서에게 무엇이든 물어보세요..."
        />
      </div>
    </div>
  );
}

function getMockResponse(text: string): string {
  if (text.includes("통계") || text.includes("발송")) {
    return `오늘 발송 통계를 확인했습니다:\n\n📊 총 발송: 1,234건\n✅ 성공: 1,211건 (98.2%)\n❌ 실패: 23건\n\n가장 활발한 계정은 "24시 자동응답"(234건)입니다. 추가 분석이 필요하신가요?`;
  }
  if (text.includes("응답률") || text.includes("채팅방")) {
    return `현재 응답률이 가장 낮은 채팅방 TOP 3:\n\n1. 고객문의-일반 (45.2%)\n2. 파트너사-B (52.1%)\n3. 이벤트알림 (61.8%)\n\n"고객문의-일반" 채팅방은 자동응답 템플릿 점검이 필요해 보입니다.`;
  }
  if (text.includes("가입자") || text.includes("신규")) {
    return `이번 주 신규 가입자 추이:\n\n월: 18명\n화: 22명\n수: 19명\n목: 24명\n\n📈 전주 대비 15% 증가 추세입니다. 주로 "프로모션 계정 A"를 통해 유입되고 있습니다.`;
  }
  if (text.includes("TOP") || text.includes("계정") || text.includes("활발")) {
    return `가장 활발한 계정 TOP 5:\n\n1. 24시 자동응답 - 234건\n2. 프로모션 계정 A - 201건\n3. SNS 통합 관리 - 167건\n4. 메인 마케팅 계정 - 142건\n5. 인스타 연동 계정 - 112건\n\n전체적으로 발송량이 안정적입니다.`;
  }
  return `요청하신 내용을 분석 중입니다. 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.\n\n예시:\n• "오늘 발송 통계 보여줘"\n• "응답률이 낮은 채팅방 알려줘"\n• "이번 주 신규 가입자 추이는?"`;
}