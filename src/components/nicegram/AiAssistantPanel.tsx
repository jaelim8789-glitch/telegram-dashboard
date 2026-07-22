"use client";

/**
 * AiAssistantPanel ? 우측 AI 비서 패널
 *
 * Claude 스타일 빈 채팅창. 추후 AI Whisper 연동 예정.
 */

import { Sparkles, MessageSquare } from "lucide-react";

interface AiAssistantPanelProps {
  chatTitle?: string;
}

export function AiAssistantPanel({ chatTitle }: AiAssistantPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-app-border px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-app-text">AI 비서</h3>
          <p className="text-[10px] text-app-text-muted truncate">
            {chatTitle ? `${chatTitle}에 대한 추천` : "대화방을 선택하세요"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary/5 mb-4">
          <MessageSquare className="h-7 w-7 text-app-primary/40" />
        </div>
        <h4 className="text-base font-semibold text-app-text mb-2">
          무엇을 도와드릴까요?
        </h4>
        <p className="text-xs text-app-text-muted leading-relaxed max-w-[250px]">
          {chatTitle
            ? `선택한 대화방(${chatTitle})의 맥락을 분석하여 최적의 답변을 추천해드립니다.`
            : "좌측 채팅방을 선택하면 AI가 답변을 추천해드립니다."}
        </p>

        {/* Feature hints */}
        <div className="mt-6 space-y-2 w-full max-w-[260px]">
          <div className="flex items-start gap-2.5 rounded-lg bg-app-card-hover/50 px-3 py-2 text-left">
            <span className="text-xs mt-0.5">??</span>
            <div>
              <p className="text-[11px] font-medium text-app-text">맥락 분석</p>
              <p className="text-[10px] text-app-text-muted">대화 내용을 분석하여 적절한 답변 제안</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-app-card-hover/50 px-3 py-2 text-left">
            <span className="text-xs mt-0.5">??</span>
            <div>
              <p className="text-[11px] font-medium text-app-text">자동 답장</p>
              <p className="text-[10px] text-app-text-muted">AI가 생성한 답변을 원클릭으로 전송</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-app-card-hover/50 px-3 py-2 text-left">
            <span className="text-xs mt-0.5">??</span>
            <div>
              <p className="text-[11px] font-medium text-app-text">감정 분석</p>
              <p className="text-[10px] text-app-text-muted">고객 감정을 파악하여 응대 전략 제안</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom input area (future) */}
      <div className="border-t border-app-border px-3 py-2.5">
        <div className="rounded-xl border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text-muted">
          AI에게 질문하기...
        </div>
      </div>
    </div>
  );
}
