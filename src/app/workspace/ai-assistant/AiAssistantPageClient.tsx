"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SummaryPanel } from "@/components/ai-assistant/SummaryPanel";
import { ChatPanel } from "@/components/ai-assistant/ChatPanel";
import { MOCK_SUMMARY_ITEMS } from "@/components/ai-assistant/mockData";
import type { ChatMessage } from "@/components/ai-assistant/types";

function getMockResponse(text: string): string {
  if (text.includes("통계") || text.includes("발송") || text.includes("성공률")) {
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
  if (text.includes("매크로") || text.includes("추천")) {
    return `현재 설정된 AI 매크로 추천:\n\n1. 📝 **자동 응답 매크로** — "고객문의-일반" 채팅방에 적용 추천\n2. 📅 **예약 발송 매크로** — 매일 오전 9시 프로모션 발송\n3. 🔄 **팔로우업 매크로** — 미응답 고객 대상 24시간 후 재발송\n\n필요한 매크로를 선택하시면 상세 설정을 도와드리겠습니다.`;
  }
  if (text.includes("스팸") || text.includes("차단")) {
    return `오늘 스팸 차단 현황:\n\n🛡️ 총 차단: 47건\n📊 차단 유형:\n- 피싱 링크: 18건\n- 스팸 키워드: 22건\n- 의심 계정: 7건\n\n모든 차단 건은 관리자 로그에서 확인 가능합니다.`;
  }
  if (text.includes("대기") || text.includes("응답")) {
    return `현재 응답 대기 중인 고객 문의 3건:\n\n1. 고객문의-일반 — "환불 가능한가요?" (32분 전)\n2. VIP 고객 전용 — "계정 등급 문의" (1시간 전)\n3. 파트너사-B — "API 연동 문의" (2시간 전)\n\n빠른 응답이 필요한 문의들입니다.`;
  }
  if (text.includes("예약")) {
    return `오늘 예약된 발송 2건:\n\n1. 📅 18:00 — "저녁 타임 프로모션" (프로모션 계정 A, 대상 850명)\n2. 📅 21:00 — "심야 공지 발송" (메인 마케팅 계정, 대상 320명)\n\n예약된 콘텐츠는 수정 가능합니다.`;
  }
  return `요청하신 내용을 분석 중입니다. 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.\n\n예시:\n• "오늘 발송 통계 보여줘"\n• "응답률이 낮은 채팅방 알려줘"\n• "이번 주 신규 가입자 추이는?"`;
}

const STREAM_DELAY = 30;

export function AiAssistantPageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingMsgIdRef = useRef<string>("");

  const streamResponse = useCallback((fullText: string) => {
    streamRef.current = "";
    let charIndex = 0;

    intervalRef.current = setInterval(() => {
      charIndex++;
      streamRef.current = fullText.slice(0, charIndex);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsgIdRef.current
            ? { ...m, content: streamRef.current }
            : m
        )
      );

      if (charIndex >= fullText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsLoading(false);
      }
    }, STREAM_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    pendingMsgIdRef.current = assistantMsg.id;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    setTimeout(() => {
      const response = getMockResponse(text);
      streamResponse(response);
    }, 600);
  }, [isLoading, streamResponse]);

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.filter((m) => m.role !== "assistant" || m.content !== ""));
      handleSendMessage(lastUserMsg.content);
    }
  }, [messages, handleSendMessage]);

  const handleSummaryClick = useCallback((title: string) => {
    handleSendMessage(title);
  }, [handleSendMessage]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-app-bg">
      <div className="hidden w-[300px] shrink-0 border-r border-app-border bg-app-surface lg:block">
        <SummaryPanel items={MOCK_SUMMARY_ITEMS} onCardClick={handleSummaryClick} />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
}
