"use client";

import { useState, useEffect } from "react";
import {
  Bot, Sparkles, Search, ShoppingCart, Star, Download,
  Loader2, CheckCircle2, X, Tag, Zap, MessageSquare, BarChart3, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import * as agentApi from "@/lib/agent-api";

const PRESET_TEMPLATES: agentApi.CreateAgentInput[] = [
  {
    name: "마케팅 어시스턴트",
    role: "marketing",
    systemPrompt: "당신은 전문 마케팅 어시스턴트입니다. 텔레그램 마케팅 캠페인을 기획하고, 카피를 작성하며, 타겟 고객 분석을 도와줍니다. 항상 데이터 기반으로 조언하고, 한국어로 응답하세요.",
  },
  {
    name: "고객 응대 매니저",
    role: "custom",
    systemPrompt: "당신은 친절하고 전문적인 고객 응대 매니저입니다. 고객 문의에 신속하고 정확하게 답변하며, 필요시 에스컬레이션을 안내합니다. 항상 예의 바르고 공감적인 태도를 유지하세요.",
  },
  {
    name: "콘텐츠 크리에이터",
    role: "custom",
    systemPrompt: "당신은 창의적인 콘텐츠 크리에이터입니다. 텔레그램 채널용 포스트, 뉴스레터, 광고 카피를 작성합니다. 트렌드에 민감하고 참신한 아이디어를 제시하세요. 한국어로 응답합니다.",
  },
  {
    name: "데이터 분석가",
    role: "custom",
    systemPrompt: "당신은 데이터 분석 전문가입니다. 발송 통계, 사용자 행동 데이터, 성과 지표를 분석하여 인사이트를 도출합니다. 숫자와 차트를 활용한 명확한 분석을 제공하세요.",
  },
  {
    name: "웹 리서처",
    role: "web_search",
    systemPrompt: "당신은 웹 리서치 전문가입니다. 최신 뉴스, 트렌드, 경쟁사 정보를 수집하여 요약합니다. 항상 출처를 명시하고, 한국어로 간결하게 정리하세요.",
  },
  {
    name: "일정 코디네이터",
    role: "scheduler",
    systemPrompt: "당신은 일정 관리 및 코디네이션 전문가입니다. 발송 일정을 계획하고, 반복 작업을 설정하며, 시간대별 최적 발송 전략을 제안합니다.",
  },
];

interface AgentMarketplaceProps {
  onAgentCreated?: (agent: agentApi.Agent) => void;
  onClose?: () => void;
}

export function AgentMarketplace({ onAgentCreated, onClose }: AgentMarketplaceProps) {
  const [templates, setTemplates] = useState<agentApi.Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    agentApi.fetchTemplates()
      .then((list) => { if (!cancelled) setTemplates(list); })
      .catch(() => { if (!cancelled) setError("템플릿을 불러올 수 없습니다."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreateFromPreset(preset: agentApi.CreateAgentInput) {
    if (creating) return;
    setCreating(preset.name);
    try {
      const agent = await agentApi.createAgent(preset);
      toast("success", `"${agent.name}" Agent가 생성되었습니다!`);
      onAgentCreated?.(agent);
    } catch {
      toast("error", "Agent 생성에 실패했습니다.");
    } finally {
      setCreating(null);
    }
  }

  async function handlePurchaseTemplate(template: agentApi.Agent) {
    if (creating) return;
    setCreating(template.id);
    try {
      const result = await agentApi.purchaseTemplate(template.id);
      toast("success", `"${result.name}" 템플릿을 구매했습니다!`);
      const agent = await agentApi.createAgent({
        name: result.name,
        role: result.role,
        systemPrompt: template.systemPrompt,
      });
      onAgentCreated?.(agent);
    } catch {
      toast("error", "템플릿 구매에 실패했습니다.");
    } finally {
      setCreating(null);
    }
  }

  const filteredPresets = PRESET_TEMPLATES.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.role.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCommunity = templates.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-app-text">Agent 템플릿 마켓</h2>
            <p className="text-[10px] text-app-text-muted">원클릭으로 Agent 생성</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-app-text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="템플릿 검색..."
            className="w-full rounded-lg border border-app-border bg-app-bg py-2 pl-8 pr-3 text-xs text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary/60"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Preset templates */}
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-2">
            <Zap className="h-3 w-3" /> 기본 템플릿
          </h3>
          {filteredPresets.length === 0 ? (
            <p className="text-[11px] text-app-text-muted italic py-4 text-center">검색 결과가 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.name}
                  className="rounded-xl border border-app-border bg-app-card p-3 transition-all hover:border-app-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
                      preset.role === "marketing" ? "bg-emerald-500/10" :
                      preset.role === "web_search" ? "bg-cyan-500/10" :
                      preset.role === "scheduler" ? "bg-amber-500/10" :
                      "bg-purple-500/10"
                    )}>
                      {preset.role === "marketing" ? "📊" :
                       preset.role === "web_search" ? "🔍" :
                       preset.role === "scheduler" ? "⏰" : "🤖"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-app-text truncate">{preset.name}</p>
                      <p className="text-[10px] text-app-text-muted mt-0.5 line-clamp-2">{preset.systemPrompt.slice(0, 60)}...</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => handleCreateFromPreset(preset)}
                    loading={creating === preset.name}
                    disabled={creating !== null}
                  >
                    <Download className="h-3 w-3" /> 생성
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community templates */}
        {filteredCommunity.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-2">
              <Star className="h-3 w-3" /> 커뮤니티 템플릿
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredCommunity.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-app-border bg-app-card p-3 transition-all hover:border-app-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm">
                      <Bot className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-app-text truncate">{t.name}</p>
                      <p className="text-[10px] text-app-text-muted capitalize">{t.role}</p>
                    </div>
                    {t.templatePrice > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0 text-[10px] font-semibold text-amber-500">
                        <Star className="h-3 w-3" /> {t.templatePrice}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-app-text-muted">
                    <span>{t.totalMessages} 메시지</span>
                    <span className="flex items-center gap-0.5">
                      <Tag className="h-3 w-3" /> Lv.{t.level}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => handlePurchaseTemplate(t)}
                    loading={creating === t.id}
                    disabled={creating !== null}
                  >
                    <ShoppingCart className="h-3 w-3" /> {t.templatePrice > 0 ? `${t.templatePrice} Stars` : "무료"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={`am-sk-${i}`} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <InlineError>{error}</InlineError>
        )}
      </div>
    </div>
  );
}
