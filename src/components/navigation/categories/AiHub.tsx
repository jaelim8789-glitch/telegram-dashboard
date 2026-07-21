"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, MessageCircle, Megaphone, Sparkles, BarChart3, Cpu, Gauge, Users, FileText, TrendingUp, ArrowRight, Bot } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { TABS, type TabId } from "@/types";
import { cn } from "@/lib/cn";
import * as agentApi from "@/lib/agent-api";

const AI_FEATURES: TabId[] = ["myai", "aireply", "aibroadcast", "aioperations", "aiopscenter", "aiusage", "operator", "styleprofile", "growthloop"];

const FEATURE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string; color: string }> = {
  myai: { icon: Sparkles, desc: "AI 운영 비서와 대화", color: "text-violet-500" },
  aireply: { icon: MessageCircle, desc: "스마트 답장 추천", color: "text-blue-500" },
  aibroadcast: { icon: Megaphone, desc: "AI 작성 발송 메시지", color: "text-amber-500" },
  aioperations: { icon: BarChart3, desc: "운영 리포트 및 인사이트", color: "text-emerald-500" },
  aiopscenter: { icon: Gauge, desc: "통합 운영 현황", color: "text-rose-500" },
  aiusage: { icon: Cpu, desc: "AI 기능 사용량 통계", color: "text-purple-500" },
  operator: { icon: Users, desc: "AI 직원 설정", color: "text-indigo-500" },
  styleprofile: { icon: FileText, desc: "브랜드 톤/스타일", color: "text-pink-500" },
  growthloop: { icon: TrendingUp, desc: "자동 성장 루프", color: "text-orange-500" },
};

export function AiHub() {
  const { toast } = useToast();
  const navigateToChat = useDashboardStore((s) => s.navigateToChat);
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);
  const [agentCount, setAgentCount] = useState(0);
  const [agentTotalLevel, setAgentTotalLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const agents = await agentApi.fetchAgents();
      setAgentCount(agents.length);
      setAgentTotalLevel(agents.reduce((s, a) => s + a.level, 0));
    } catch { toast("error", "Agent 정보를 불러오지 못했습니다."); } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const aiTabs = TABS.filter((t) => AI_FEATURES.includes(t.id));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-app-text">AI</h2>

      <button
        type="button"
        onClick={navigateToChat}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-app-primary/30 bg-gradient-to-r from-violet-500/10 to-blue-500/10 px-4 py-4 text-left transition-all hover:border-app-primary/50 active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-primary/20">
          <Sparkles className="h-5 w-5 text-app-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-app-text">AI와 대화하기</p>
          <p className="text-[11px] text-app-text-muted">운영 비서에게 무엇이든 물어보세요</p>
        </div>
        <ArrowRight className="h-4 w-4 text-app-primary shrink-0" />
      </button>

      {!loading && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-app-border/50 bg-violet-500/5 px-3 py-2 text-center">
            <p className="text-lg font-bold text-violet-500">{agentCount}</p>
            <p className="text-[10px] text-app-text-muted">Agent</p>
          </div>
          <div className="rounded-xl border border-app-border/50 bg-blue-500/5 px-3 py-2 text-center">
            <p className="text-lg font-bold text-blue-500">{agentTotalLevel}</p>
            <p className="text-[10px] text-app-text-muted">총 레벨</p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">AI 기능</p>
        {aiTabs.map((tab) => {
          const meta = FEATURE_META[tab.id];
          const Icon = meta?.icon || Bot;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateToFeature(tab.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-app-border bg-app-card px-3 py-3 text-left transition-all hover:border-app-primary/30 hover:bg-app-card-hover active:scale-[0.98]"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", "bg-app-card-hover")}>
                <Icon className={cn("h-4.5 w-4.5", meta?.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text">{tab.label}</p>
                {meta?.desc && <p className="text-[11px] text-app-text-muted truncate">{meta.desc}</p>}
              </div>
              <ArrowRight className="h-4 w-4 text-app-text-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
