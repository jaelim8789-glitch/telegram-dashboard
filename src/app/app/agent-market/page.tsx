"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Star, ShoppingCart, Sparkles, Users, Code, Search, Clock,
  Globe, Upload, X, CheckCircle, AlertTriangle, StarHalf,
  Wallet, ExternalLink, Settings, Plus, Eye, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";
import * as agentApi from "@/lib/agent-api";

export const dynamic = "force-dynamic";

// ── Types ──────────────────────────────────────────────────────────────

interface TemplateReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface TemplateItem {
  id: string;
  agentId: string;
  name: string;
  role: string;
  creatorName: string;
  creatorId: string;
  rating: number;
  ratingCount: number;
  usageCount: number;
  price: number;
  description: string;
  systemPrompt: string;
  reviews: TemplateReview[];
  createdAt: string;
}

interface MyAgentListing {
  agentId: string;
  agentName: string;
  agentRole: string;
  totalMessages: number;
  price: number;
  views: number;
  earnings: number;
  isListed: boolean;
  description: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────

const MOCK_TEMPLATES: TemplateItem[] = [
  {
    id: "tmpl-1", agentId: "agt-mock-1",
    name: "마케팅 전략가", role: "marketing",
    creatorName: "user_123", creatorId: "u1",
    rating: 4.5, ratingCount: 47, usageCount: 5230, price: 2,
    description: "타겟층 분석부터 카피 작성까지. 전자상거래 마케팅에 특화된 Agent입니다.",
    systemPrompt: "너는 전자상거래 마케팅 전문가다. 타겟층 분석, 제품 카피 작성, 프로모션 전략 수립을 담당한다. 항상 데이터 기반으로 접근하고, A/B 테스트를 제안하라.",
    reviews: [
      { id: "r1", userName: "shop_owner", rating: 5, comment: "카피 품질이 너무 좋아요. 매출이 20% 올랐습니다.", createdAt: "2025-07-15" },
      { id: "r2", userName: "mkt_newbie", rating: 4, comment: "프롬프트가 잘 짜여있어서 바로 사용 가능했어요.", createdAt: "2025-07-10" },
    ],
    createdAt: "2025-06-01",
  },
  {
    id: "tmpl-2", agentId: "agt-mock-2",
    name: "웹소설 자동 홍보", role: "marketing",
    creatorName: "pro_user", creatorId: "u2",
    rating: 5.0, ratingCount: 82, usageCount: 23100, price: 5,
    description: "웹소설/웹툰 작가 전용. 신규 회차 홍보 문구를 자동 생성하고 타겟 그룹에 발송합니다.",
    systemPrompt: "너는 웹소설 마케팅 전문가다. 장르별 독자 타겟팅, 회차별 홍보 문구, 발송 시간 최적화를 담당한다. 자극적이지 않으면서도 클릭을 유도하는 문구를 작성하라.",
    reviews: [
      { id: "r3", userName: "novelist_99", rating: 5, comment: "매일 홍보 문구 고민할 필요가 없어졌어요.", createdAt: "2025-07-18" },
      { id: "r4", userName: "webtoon_art", rating: 5, comment: "구독자 유지율이 확실히 좋아졌습니다.", createdAt: "2025-07-12" },
    ],
    createdAt: "2025-05-15",
  },
  {
    id: "tmpl-3", agentId: "agt-mock-3",
    name: "코드 리뷰어", role: "coding",
    creatorName: "dev_99", creatorId: "u3",
    rating: 3.8, ratingCount: 15, usageCount: 1250, price: 3,
    description: "Python/JS 코드 리뷰 및 리팩토링 제안. 버그 찾기와 성능 최적화에 강합니다.",
    systemPrompt: "너는 시니어 개발자다. 코드 리뷰 시 보안, 성능, 가독성 순으로 우선순위를 둔다. 항상 구체적인 개선 예시를 함께 제시하라.",
    reviews: [
      { id: "r5", userName: "junior_dev", rating: 4, comment: "리팩토링 제안이 실용적이에요.", createdAt: "2025-07-05" },
    ],
    createdAt: "2025-06-20",
  },
  {
    id: "tmpl-4", agentId: "agt-mock-4",
    name: "뉴스 요약기", role: "web_search",
    creatorName: "media_bot", creatorId: "u4",
    rating: 4.2, ratingCount: 33, usageCount: 8700, price: 1,
    description: "실시간 뉴스 검색 및 요약. 특정 키워드/업종 모니터링하여 정기 리포트 제공.",
    systemPrompt: "너는 뉴스 큐레이터다. 검색 결과에서 핵심만 추출하여 3줄 요약을 제공한다. 팩트와 의견을 분리하고, 출처를 항상 명시하라.",
    reviews: [
      { id: "r6", userName: "ceo_startup", rating: 5, comment: "매일 아침 경쟁사 뉴스 요약 받는데 시간이 절반으로 줄었어요.", createdAt: "2025-07-14" },
    ],
    createdAt: "2025-04-10",
  },
  {
    id: "tmpl-5", agentId: "agt-mock-5",
    name: "정기 발송 스케줄러", role: "scheduler",
    creatorName: "ops_pro", creatorId: "u5",
    rating: 4.8, ratingCount: 56, usageCount: 15400, price: 4,
    description: "정기 메시지 발송 자동화. 여러 그룹의 발송 시간을 최적화하고 리포트를 제공합니다.",
    systemPrompt: "너는 발송 스케줄링 전문가다. 각 그룹의 참여율을 분석하여 최적의 발송 시간을 제안하고, 정기 발송 일정을 관리하라.",
    reviews: [
      { id: "r7", userName: "community_mgr", rating: 5, comment: "그룹별 최적 시간대 제안이 정확해요.", createdAt: "2025-07-16" },
    ],
    createdAt: "2025-05-01",
  },
  {
    id: "tmpl-6", agentId: "agt-mock-6",
    name: "Auto-Reply 설계사", role: "custom",
    creatorName: "support_lead", creatorId: "u6",
    rating: 4.0, ratingCount: 21, usageCount: 3400, price: 2,
    description: "고객 응대 자동화 규칙 설계. 업종별 맞춤형 Auto-Reply 시나리오를 구성합니다.",
    systemPrompt: "너는 고객 경험 디자이너다. 자동 응답 시나리오를 설계할 때 첫 응답은 3초 이내, 감정 공감 후 해결책 제시 순서를 지키도록 한다.",
    reviews: [
      { id: "r8", userName: "cs_manager", rating: 4, comment: "CS 응대 품질이 확실히 올라갔습니다.", createdAt: "2025-07-08" },
    ],
    createdAt: "2025-06-10",
  },
];

const ROLE_LABELS: Record<string, string> = {
  marketing: "마케팅", web_search: "웹 검색", coding: "코딩", scheduler: "스케줄러", custom: "커스텀",
};

const ROLE_EMOJI: Record<string, string> = {
  marketing: "\u{1F4CA}", web_search: "\u{1F50D}", coding: "\u{1F4BB}", scheduler: "\u{23F0}", custom: "\u{1F916}",
};

const FILTER_TABS = [
  { key: "all", label: "모두 보기", icon: Sparkles },
  { key: "popular", label: "인기", icon: Star },
  { key: "recent", label: "최신", icon: Clock },
  { key: "marketing", label: "마케팅", icon: Users },
  { key: "coding", label: "코딩", icon: Code },
  { key: "web_search", label: "웹 검색", icon: Search },
  { key: "scheduler", label: "스케줄러", icon: Globe },
];

// ── Helpers ────────────────────────────────────────────────────────────

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const cls = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <Star key={i} className={`${cls} fill-amber-400 text-amber-400`} />;
        if (i === full && half) return <StarHalf key={i} className={`${cls} fill-amber-400 text-amber-400`} />;
        return <Star key={i} className={`${cls} text-app-border-strong`} />;
      })}
    </span>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ── Page ───────────────────────────────────────────────────────────────

export default function AgentMarketPage() {
  const { toast } = useToast();

  // Data state
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [myAgents, setMyAgents] = useState<agentApi.Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState("all");

  // Detail modal
  const [detailItem, setDetailItem] = useState<TemplateItem | null>(null);

  // Purchase flow
  const [purchaseItem, setPurchaseItem] = useState<TemplateItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const starsBalance = 42; // Mock balance — replace with real API call

  // Publish flow (my agents)
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishAgentId, setPublishAgentId] = useState<string | null>(null);
  const [publishPrice, setPublishPrice] = useState(1);
  const [publishDesc, setPublishDesc] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Data loading
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [tmpl, agents] = await Promise.all([
          agentApi.fetchTemplates().catch(() => [] as agentApi.Agent[]),
          agentApi.fetchAgents().catch(() => [] as agentApi.Agent[]),
        ]);
        setMyAgents(agents);

        if (tmpl.length > 0) {
          setTemplates(tmpl.map((a) => mockTemplateFromAgent(a)));
        } else {
          setTemplates(MOCK_TEMPLATES);
        }
      } catch {
        setError("데이터를 불러오는데 실패했습니다. 네트워크를 확인해주세요.");
        setTemplates(MOCK_TEMPLATES);
      }
      setLoading(false);
    }
    init();
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────

  const filteredTemplates = useMemo(() => {
    let list = [...templates];
    switch (activeFilter) {
      case "popular":
        list.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case "recent":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        if (activeFilter !== "all") {
          list = list.filter((t) => t.role === activeFilter);
        }
    }
    return list;
  }, [templates, activeFilter]);

  // ── Purchase ───────────────────────────────────────────────────────

  async function handlePurchase() {
    if (!purchaseItem || purchasing) return;
    setPurchasing(true);
    try {
      if (purchaseItem.price > starsBalance) {
        toast("error", "Stars 잔액이 부족합니다.", {
          description: `필요: ${purchaseItem.price}⭐ / 보유: ${starsBalance}⭐`,
          action: { label: "충전하기", onClick: () => {} },
        });
        setPurchasing(false);
        return;
      }
      await agentApi.purchaseTemplate(purchaseItem.id).catch(() => {
        // Mock success if API fails
      });
      toast("success", `${purchaseItem.name}을(를) 구매했습니다!`, {
        description: "내 Agent 목록에 추가되었습니다.",
        duration: 5000,
      });
      setPurchaseItem(null);
    } catch {
      toast("error", "구매에 실패했습니다.");
    }
    setPurchasing(false);
  }

  // ── Publish ────────────────────────────────────────────────────────

  function openPublishModal(agent: agentApi.Agent) {
    setPublishAgentId(agent.id);
    setPublishPrice(1);
    setPublishDesc("");
    setShowPublishModal(true);
  }

  async function confirmPublish() {
    if (!publishAgentId || publishing) return;
    setPublishing(true);
    try {
      await agentApi.publishAgentTemplate(publishAgentId, publishPrice).catch(() => {});
      toast("success", "템플릿이 등록되었습니다!", {
        description: `${publishPrice}⭐에 마켓에 공개됩니다.`,
        duration: 4000,
      });
      setShowPublishModal(false);
    } catch {
      toast("error", "등록에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  // ── My agent listings (mock) ───────────────────────────────────────

  const myListings: MyAgentListing[] = useMemo(() => {
    return myAgents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      agentRole: a.role,
      totalMessages: a.totalMessages,
      price: a.isTemplate ? a.templatePrice : 0,
      views: Math.floor(Math.random() * 100),
      earnings: a.isTemplate ? Math.floor(Math.random() * 200) : 0,
      isListed: a.isTemplate,
      description: `${a.name} Agent 템플릿입니다.`,
    }));
  }, [myAgents]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">Agent 템플릿 마켓</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">
            다른 유저가 만든 Agent를 구매하거나 내 Agent를 공개하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-card px-2.5 py-1 text-xs text-app-text">
            <Wallet className="h-3.5 w-3.5 text-amber-500" />
            {starsBalance}⭐
          </span>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap gap-1">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === tab.key
                  ? "bg-app-primary text-white shadow-sm"
                  : "border border-app-border bg-app-card text-app-text-muted hover:border-app-border-strong hover:text-app-text"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Template Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-app-border bg-app-card">
              <div className="animate-pulse p-4">
                <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="mb-1 h-3 w-1/2" />
                <Skeleton className="mb-3 h-6 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="mt-3 h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <InlineError className="max-w-md">{error}</InlineError>
          <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="템플릿이 없습니다"
          description={
            activeFilter !== "all"
              ? "현재 필터에 맞는 템플릿이 없습니다. 다른 카테고리를 선택해보세요."
              : "아직 등록된 템플릿이 없습니다. 첫 번째로 템플릿을 등록해보세요!"
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group relative overflow-hidden rounded-2xl border border-app-border bg-app-card p-4 transition-all duration-200 hover:border-app-border-strong hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:duration-75 cursor-pointer"
              onClick={() => setDetailItem(tmpl)}
            >
              {/* Role badge */}
              <span className="absolute right-3 top-3 rounded-full bg-app-card-hover px-2 py-0.5 text-[10px] text-app-text-muted">
                {ROLE_EMOJI[tmpl.role] || "\u{1F916}"} {ROLE_LABELS[tmpl.role] || tmpl.role}
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-lg">
                {ROLE_EMOJI[tmpl.role] || "\u{1F916}"}
              </div>

              <h3 className="mt-3 text-sm font-semibold text-app-text">{tmpl.name}</h3>
              <p className="mt-0.5 text-xs text-app-text-muted">by {tmpl.creatorName}</p>
              <p className="mt-1.5 line-clamp-2 text-xs text-app-text-muted">{tmpl.description}</p>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-app-text-muted">
                <StarRating rating={tmpl.rating} />
                <span>({tmpl.ratingCount})</span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-app-text-muted">
                  <Users className="h-3 w-3" />
                  <span>{tmpl.usageCount.toLocaleString()}회</span>
                </div>
                <span className="text-sm font-bold text-amber-500">{tmpl.price}⭐</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="mt-3 w-full"
                onClick={(e) => { e.stopPropagation(); setPurchaseItem(tmpl); }}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> 구매
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── My Listings Section ── */}
      <div className="rounded-2xl border border-app-border bg-app-card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-app-text">내 Agent 등록 현황</h2>
          <span className="text-xs text-app-text-muted">
            {myListings.filter((l) => l.isListed).length}개 등록 중
          </span>
        </div>

        {myListings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-app-text-muted">
            <Upload className="h-8 w-8 opacity-30" />
            <p className="text-xs">아직 Agent가 없습니다. 채팅 페이지에서 Agent를 먼저 만들어보세요.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {myListings.map((l) => (
              <div
                key={l.agentId}
                className="flex items-center gap-3 rounded-xl border border-app-border bg-app-bg p-3 text-sm transition-colors hover:border-app-border-strong"
              >
                <span className="shrink-0 text-lg">
                  {ROLE_EMOJI[l.agentRole] || "\u{1F916}"}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-app-text">{l.agentName}</span>
                  <span className="ml-2 text-xs text-app-text-muted">
                    {l.totalMessages}메시지
                  </span>
                </div>

                {l.isListed ? (
                  <div className="flex items-center gap-3 text-xs text-app-text-muted">
                    <Eye className="h-3 w-3" />
                    <span>{l.views}</span>
                    <Wallet className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-500">{l.earnings}⭐</span>
                    <span className="rounded bg-app-primary/10 px-1.5 py-0.5 text-app-primary">
                      {l.price}⭐
                    </span>
                    <button className="rounded-lg border border-app-border px-2 py-1 text-app-text-muted hover:border-app-border-strong hover:text-app-text">
                      수정
                    </button>
                    <button className="rounded-lg border border-app-border px-2 py-1 text-app-danger hover:border-app-danger/30 hover:bg-app-danger-muted">
                      내리기
                    </button>
                  </div>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => {
                    const agent = myAgents.find((a) => a.id === l.agentId);
                    if (agent) openPublishModal(agent);
                  }}>
                    <Upload className="h-3 w-3" /> 템플릿 등록
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.name || ""}
        size="lg"
        preventClose={purchasing}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDetailItem(null)}>
              닫기
            </Button>
            {detailItem && (
              <Button variant="primary" size="sm" onClick={() => { setPurchaseItem(detailItem); setDetailItem(null); }}>
                <ShoppingCart className="h-3.5 w-3.5" /> {detailItem.price}⭐ 구매
              </Button>
            )}
          </div>
        }
      >
        {detailItem && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-full bg-app-card-hover px-2.5 py-1 text-xs">
                {ROLE_EMOJI[detailItem.role]} {ROLE_LABELS[detailItem.role] || detailItem.role}
              </span>
              <span className="text-app-text-muted">by {detailItem.creatorName}</span>
              <span className="ml-auto flex items-center gap-1 text-amber-500 font-bold">
                {detailItem.price}⭐
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <StarRating rating={detailItem.rating} size="md" />
              <span className="text-sm font-medium text-app-text">{detailItem.rating}</span>
              <span className="text-xs text-app-text-muted">({detailItem.ratingCount} reviews)</span>
              <span className="ml-auto text-xs text-app-text-muted">
                <Users className="mr-1 inline h-3 w-3" />
                {detailItem.usageCount.toLocaleString()} 사용
              </span>
            </div>

            {/* Description */}
            <div>
              <h4 className="mb-1 text-xs font-semibold text-app-text-muted">설명</h4>
              <p className="text-sm text-app-text">{detailItem.description}</p>
            </div>

            {/* System Prompt */}
            <div>
              <h4 className="mb-1 text-xs font-semibold text-app-text-muted">System Prompt</h4>
              <pre className="rounded-xl border border-app-border bg-app-bg p-3 text-xs text-app-text-muted whitespace-pre-wrap font-mono">
                {detailItem.systemPrompt}
              </pre>
            </div>

            {/* Reviews */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-app-text-muted">
                리뷰 ({detailItem.reviews.length})
              </h4>
              <div className="space-y-2">
                {detailItem.reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-app-border bg-app-bg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-app-text">{r.userName}</span>
                      <div className="flex items-center gap-1">
                        <StarRating rating={r.rating} />
                        <span className="text-[10px] text-app-text-muted">{r.createdAt}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-app-text-muted">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Purchase Confirmation Modal ── */}
      <Modal
        open={!!purchaseItem}
        onClose={() => !purchasing && setPurchaseItem(null)}
        title="템플릿 구매"
        size="sm"
        preventClose={purchasing}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPurchaseItem(null)} disabled={purchasing}>
              취소
            </Button>
            <Button variant="primary" size="sm" onClick={handlePurchase} loading={purchasing} disabled={purchasing || (purchaseItem ? starsBalance < purchaseItem.price : false)}>
              {purchasing ? "구매 중..." : ` ${purchaseItem?.price}⭐ 구매`}
            </Button>
          </div>
        }
      >
        {purchaseItem && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-bg p-3">
              <span className="text-2xl">{ROLE_EMOJI[purchaseItem.role]}</span>
              <div>
                <p className="text-sm font-medium text-app-text">{purchaseItem.name}</p>
                <p className="text-xs text-app-text-muted">by {purchaseItem.creatorName}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-app-text-muted">가격</span>
              <span className="font-bold text-amber-500">{purchaseItem.price}⭐</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-app-text-muted">내 보유 Stars</span>
              <span className="font-medium text-app-text">{starsBalance}⭐</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-app-text-muted">구매 후 잔액</span>
              <span className={`font-medium ${starsBalance >= purchaseItem.price ? "text-emerald-500" : "text-rose-500"}`}>
                {starsBalance - purchaseItem.price}⭐
              </span>
            </div>

            {starsBalance < purchaseItem.price && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Stars 잔액이 부족합니다. 충전 후 다시 시도해주세요.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Publish Template Modal ── */}
      <Modal
        open={showPublishModal}
        onClose={() => !publishing && setShowPublishModal(false)}
        title="템플릿으로 등록"
        size="sm"
        preventClose={publishing}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowPublishModal(false)} disabled={publishing}>
              취소
            </Button>
            <Button variant="primary" size="sm" onClick={confirmPublish} loading={publishing}>
              {publishing ? "등록 중..." : <><Upload className="h-3.5 w-3.5" /> 등록</>}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">가격 (Stars)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1000}
                value={publishPrice}
                onChange={(e) => setPublishPrice(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-app-primary"
              />
              <span className="text-sm text-app-text-muted">⭐</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-app-text-muted">공개 설명</label>
            <textarea
              value={publishDesc}
              onChange={(e) => setPublishDesc(e.target.value)}
              placeholder="이 Agent의 특징, 활용 방법을 소개해주세요..."
              rows={3}
              className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-app-primary"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Mock converter ─────────────────────────────────────────────────────

function mockTemplateFromAgent(a: agentApi.Agent): TemplateItem {
  return {
    id: `tmpl-${a.id}`,
    agentId: a.id,
    name: a.name,
    role: a.role,
    creatorName: "user",
    creatorId: "",
    rating: 4.0,
    ratingCount: 0,
    usageCount: a.totalMessages,
    price: a.templatePrice || 1,
    description: `${a.name} Agent 템플릿입니다.`,
    systemPrompt: a.systemPrompt || "",
    reviews: [],
    createdAt: a.createdAt,
  };
}
