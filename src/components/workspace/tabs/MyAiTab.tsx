"use client";

import { useState, useEffect } from "react";
import { Bot, MessageSquare, MessageCircle, Megaphone, BarChart3, Cpu, Gauge, Sparkles, ExternalLink, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AiReplyAssistantTab } from "@/components/workspace/tabs/AiReplyAssistantTab";
import { AiBroadcastAssistantTab } from "@/components/workspace/tabs/AiBroadcastAssistantTab";
import { AiOperationsReportTab } from "@/components/workspace/tabs/AiOperationsReportTab";
import { AiOperationsCenterTab } from "@/components/workspace/tabs/AiOperationsCenterTab";
import { AiUsageTab } from "@/components/workspace/tabs/AiUsageTab";
import * as agentApi from "@/lib/agent-api";

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

const EXP_PER_LEVEL = 100;

function AgentLevelBadge({ level, exp }: { level: number; exp: number }) {
  const expToNext = EXP_PER_LEVEL * level;
  const pct = Math.min(Math.round((exp / expToNext) * 100), 100);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="rounded bg-app-primary/10 px-1.5 py-0.5 font-semibold text-app-primary">
        Lv.{level}
      </span>
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-app-border">
        <div className="absolute inset-y-0 left-0 rounded-full bg-app-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-app-text-muted">{exp}/{expToNext}</span>
    </div>
  );
}

function AiChatRedirect() {
  const [agents, setAgents] = useState<agentApi.Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    agentApi.fetchAgents()
      .then(list => { if (!cancelled) setAgents(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalLevel = agents.reduce((sum, a) => sum + a.level, 0);
  const totalExp = agents.reduce((sum, a) => sum + a.exp, 0);
  const totalMessages = agents.reduce((sum, a) => sum + a.totalMessages, 0);

  return (
    <div className="space-y-3">
      {/* 요약 카드 */}
      <Link href="/app/chat"
        className="flex items-center gap-4 rounded-xl border border-app-border bg-app-card p-4 transition-all hover:border-app-primary/40 hover:bg-app-card-hover group">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-primary/10">
          <MessageSquare className="h-6 w-6 text-app-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-app-text">AI Agent 대화방</h3>
            <ChevronRight className="h-3.5 w-3.5 text-app-text-muted group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-app-text-muted mt-0.5">Agent를 만들고 대화하며 레벨업하세요</p>
        </div>
      </Link>

      {/* Agent 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-app-text-muted">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-xs">Agent 불러오는 중...</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-app-border bg-app-card py-10 px-4 text-center">
          <Bot className="h-8 w-8 text-app-text-muted/30" />
          <p className="text-xs text-app-text-muted">아직 생성한 Agent가 없습니다</p>
          <Link href="/app/chat"
            className="inline-flex items-center gap-1 rounded-lg bg-app-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
            <Bot className="h-3.5 w-3.5" />
            새 Agent 만들기
          </Link>
        </div>
      ) : (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-center">
              <div className="text-lg font-bold text-app-text">{agents.length}</div>
              <div className="text-[10px] text-app-text-muted">Agent</div>
            </div>
            <div className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-center">
              <div className="text-lg font-bold text-app-primary">{totalLevel}</div>
              <div className="text-[10px] text-app-text-muted">총 레벨</div>
            </div>
            <div className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-center">
              <div className="text-lg font-bold text-app-text">{totalMessages}</div>
              <div className="text-[10px] text-app-text-muted">총 메시지</div>
            </div>
          </div>

          {/* Agent 리스트 */}
          <div className="space-y-1">
            {agents.slice(0, 5).map(agent => (
              <Link key={agent.id} href="/app/chat"
                className="flex items-center justify-between rounded-lg border border-app-border bg-app-card px-3 py-2 transition-all hover:border-app-primary/30 hover:bg-app-card-hover">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-app-primary/10 text-[10px] font-bold text-app-primary">
                    {agent.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-app-text">{agent.name}</p>
                    <p className="text-[10px] text-app-text-muted capitalize">{agent.role}</p>
                  </div>
                </div>
                <AgentLevelBadge level={agent.level} exp={agent.exp} />
              </Link>
            ))}
            {agents.length > 5 && (
              <Link href="/app/chat"
                className="block rounded-lg border border-dashed border-app-border px-3 py-2 text-center text-[10px] text-app-text-muted transition-colors hover:border-app-primary/30 hover:text-app-primary">
                +{agents.length - 5}개 더보기
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
