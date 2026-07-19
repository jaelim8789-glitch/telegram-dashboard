"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles, BarChart3, Activity, Cpu, CreditCard } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

interface UsageSummary {
  features: Record<string, { requests: number; tokens: number; credits: number }>;
  total_requests: number;
  total_tokens: number;
  total_credits: number;
  period_days: number;
}

interface PlanLimit {
  id: string;
  plan: string;
  feature: string;
  max_requests_per_day: number;
  max_tokens_per_day: number;
  max_credits_per_month: number;
  is_enabled: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  chat: "AI Chat",
  reply_assistant: "AI Reply Assistant",
  broadcast_assistant: "AI Broadcast Assistant",
  operations_report: "AI Operations Report",
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  chat: <Bot className="h-4 w-4" />,
  reply_assistant: <Activity className="h-4 w-4" />,
  broadcast_assistant: <Sparkles className="h-4 w-4" />,
  operations_report: <BarChart3 className="h-4 w-4" />,
};

export function AiUsageTab() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, limitsRes] = await Promise.all([
          fetch("/api/ai/usage?days=30"),
          fetch("/api/ai/plan-limits"),
        ]);
        if (usageRes.ok) setUsage(await usageRes.json());
        if (limitsRes.ok) setLimits(await limitsRes.json());
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-xs text-app-text-muted">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-app-primary" />
        <h2 className="text-sm font-bold text-app-text">AI 사용량</h2>
        <span className="text-[10px] text-app-text-muted">최근 30일 기준</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <Activity className="h-3.5 w-3.5 text-app-primary" />
            총 요청
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-app-text">
            {usage?.total_requests ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <Cpu className="h-3.5 w-3.5 text-app-warning" />
            총 토큰
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-app-text">
            {(usage?.total_tokens ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <CreditCard className="h-3.5 w-3.5 text-app-success" />
            크레딧
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-app-text">
            {usage?.total_credits ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <BarChart3 className="h-3.5 w-3.5 text-app-info" />
            기간
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-app-text">
            {usage?.period_days ?? 30}일
          </p>
        </div>
      </div>

      {/* Feature Usage */}
      <Panel title="기능별 사용량">
        <div className="space-y-3">
          {usage?.features && Object.keys(usage.features).length > 0 ? (
            Object.entries(usage.features).map(([key, data]) => {
              const limit = limits.find(l => l.feature === key);
              return (
                <div key={key} className="rounded-xl border border-app-border bg-app-bg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {FEATURE_ICONS[key] || <Activity className="h-4 w-4 text-app-text-muted" />}
                      <span className="text-xs font-medium text-app-text">
                        {FEATURE_LABELS[key] || key}
                      </span>
                    </div>
                    <span className="text-[11px] text-app-text-muted">
                      {data.requests}회 요청
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-app-text-muted">
                    <span>토큰: {data.tokens.toLocaleString()}</span>
                    <span>크레딧: {data.credits}</span>
                    {limit && (
                      <span className={cn(
                        limit.max_requests_per_day > 0 ? "text-app-info" : "text-app-text-subtle"
                      )}>
                        일일 한도: {limit.max_requests_per_day > 0 ? `${limit.max_requests_per_day}회` : "무제한"}
                      </span>
                    )}
                  </div>
                  {limit && limit.max_requests_per_day > 0 && (
                    <div className="mt-2 h-1.5 w-full rounded-full bg-app-border overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full transition-all",
                        data.requests / limit.max_requests_per_day > 0.8 ? "bg-app-danger" :
                        data.requests / limit.max_requests_per_day > 0.5 ? "bg-app-warning" : "bg-app-success"
                      )} style={{ width: `${Math.min(100, (data.requests / limit.max_requests_per_day) * 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-app-text-muted text-center py-4">사용량 데이터가 없습니다</p>
          )}
        </div>
      </Panel>

      {/* Plan Limits */}
      {limits.length > 0 && (
        <Panel title="플랜 제한">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border">
                  <th className="text-left py-2 px-2 text-app-text-muted font-medium">기능</th>
                  <th className="text-right py-2 px-2 text-app-text-muted font-medium">일일 요청</th>
                  <th className="text-right py-2 px-2 text-app-text-muted font-medium">일일 토큰</th>
                  <th className="text-right py-2 px-2 text-app-text-muted font-medium">월 크레딧</th>
                  <th className="text-center py-2 px-2 text-app-text-muted font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {limits.map(limit => (
                  <tr key={limit.id} className="border-b border-app-border/50">
                    <td className="py-2 px-2 text-app-text">
                      {FEATURE_LABELS[limit.feature] || limit.feature}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-app-text">
                      {limit.max_requests_per_day > 0 ? limit.max_requests_per_day.toLocaleString() : "∞"}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-app-text">
                      {limit.max_tokens_per_day > 0 ? limit.max_tokens_per_day.toLocaleString() : "∞"}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-app-text">
                      {limit.max_credits_per_month > 0 ? limit.max_credits_per_month : "∞"}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        limit.is_enabled ? "bg-app-success-muted text-app-success" : "bg-app-danger-muted text-app-danger"
                      )}>
                        {limit.is_enabled ? "활성" : "비활성"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}