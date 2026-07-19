"use client";

import { useState } from "react";
import { Bot, MessageSquare, MessageCircle, Megaphone, BarChart3, Cpu, Gauge, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AiReplyAssistantTab } from "@/components/workspace/tabs/AiReplyAssistantTab";
import { AiBroadcastAssistantTab } from "@/components/workspace/tabs/AiBroadcastAssistantTab";
import { AiOperationsReportTab } from "@/components/workspace/tabs/AiOperationsReportTab";
import { AiOperationsCenterTab } from "@/components/workspace/tabs/AiOperationsCenterTab";
import { AiUsageTab } from "@/components/workspace/tabs/AiUsageTab";

const SUB_TABS = [
  { id: "chat", label: "AI 대화", icon: MessageSquare, desc: "AI 운영 비서와 자유롭게 대화" },
  { id: "reply", label: "AI 답장", icon: MessageCircle, desc: "스마트 답장 추천" },
  { id: "broadcast", label: "AI 발송", icon: Megaphone, desc: "AI가 작성한 발송 메시지" },
  { id: "operations", label: "AI 리포트", icon: BarChart3, desc: "운영 리포트 및 인사이트" },
  { id: "opscenter", label: "AI 운영 센터", icon: Gauge, desc: "통합 운영 현황" },
  { id: "usage", label: "AI 사용량", icon: Cpu, desc: "AI 기능 사용 통계" },
];

export function MyAiTab() {
  const [activeSub, setActiveSub] = useState("chat");

  return (
    <div className="flex flex-col gap-4">
      {/* 서브탭 네비게이션 */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSub(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeSub === tab.id
                ? "bg-app-primary text-white shadow-sm"
                : "bg-app-card border border-app-border text-app-text-muted hover:bg-app-card-hover"
            }`}>
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 서브탭 콘텐츠 */}
      <div className="flex-1">
        <ActiveContent sub={activeSub} />
      </div>
    </div>
  );
}

function ActiveContent({ sub }: { sub: string }) {
  switch (sub) {
    case "chat":
      return <AiChatRedirect />;
    case "reply":
      return <AiReplyAssistantTab />;
    case "broadcast":
      return <AiBroadcastAssistantTab />;
    case "operations":
      return <AiOperationsReportTab />;
    case "opscenter":
      return <AiOperationsCenterTab />;
    case "usage":
      return <AiUsageTab />;
    default:
      return <AiChatRedirect />;
  }
}

function AiChatRedirect() {
  return (
    <Link href="/app/chat"
      className="flex flex-col items-center justify-center rounded-xl border border-app-border bg-app-card py-16 px-4 text-center hover:border-app-primary/50 hover:bg-app-card-hover transition-all group cursor-pointer">
      <MessageSquare className="h-10 w-10 text-app-primary mb-4 group-hover:scale-110 transition-transform" />
      <h3 className="text-sm font-semibold text-app-text mb-1">AI Agent 대화방</h3>
      <p className="text-xs text-app-text-muted max-w-md mb-4">
        Agent를 만들고 대화하며 레벨업하세요. 템플릿 마켓에서 다른 사용자의 Agent도 구매할 수 있습니다.
      </p>
      <span className="inline-flex items-center gap-1 rounded-lg bg-app-primary px-4 py-2 text-xs font-medium text-white shadow-sm">
        AI Agent 페이지로 이동
        <ExternalLink className="h-3 w-3" />
      </span>
    </Link>
  );
}
