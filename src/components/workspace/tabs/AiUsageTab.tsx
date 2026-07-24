"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles, BarChart3, Activity, Cpu, CreditCard } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { AiSubTabLayout } from "@/components/ai/AiSubTabLayout";

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
  const [todayUsage, setTodayUsage] = useState<UsageSummary | null>(null);
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, limitsRes, todayRes] = await Promise.all([
          fetch("/api/ai/usage?days=30"),
          fetch("/api/ai/plan-limits"),
          fetch("/api/ai/usage?days=1"),
        ]);
        if (usageRes.ok) setUsage(await usageRes.json());
        if (limitsRes.ok) setLimits(await limitsRes.json());
        if (todayRes.ok) setTodayUsage(await todayRes.json());
      } catch (e) { console.warn('Unhandled error in AiUsageTab', e) } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <AiSubTabLayout
      icon={<Cpu className="h-5 w-5 text-app-primary" />}
      title="AI ?�용??
      subtitle="최근 30??기�?"
      loading={loading}
    >
      {/* ?�늘 ?�용??배�? */}
      {todayUsage && (
        <div className="flex items-center gap-2 rounded-xl border border-app-primary/20 bg-app-primary/5 px-3 py-2">
          <Activity className="h-4 w-4 text-app-primary" />
          <span className="text-xs font-semibold text-app-text">?�늘 ?�용??/span>
          <span className="text-xs text-app-text-muted">
            ?�청 {todayUsage.total_requests}??· ?�큰 {todayUsage.total_tokens.toLocaleString()} · ?�레??{todayUsage.total_credits}
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <Activity className="h-3.5 w-3.5 text-app-primary" />
            �??�청
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-app-text">
            {usage?.total_requests ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <Cpu className="h-3.5 w-3.5 text-app-warning" />
            �??�큰
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-app-text">
            {(usage?.total_tokens ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <CreditCard className="h-3.5 w-3.5 text-app-success" />
            ?�레??
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
            {usage?.period_days ?? 30}??
          </p>
        </div>
      </div>

      {/* Feature Usage */}
      <Panel title="기능�??�용??>
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
                      {data.requests}???�청
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-app-text-muted">
                    <span>?�큰: {data.tokens.toLocaleString()}</span>
                    <span>?�레?? {data.credits}</span>
                    {limit && (
                      <span className={cn(
                        limit.max_requests_per_day > 0 ? "text-app-info" : "text-app-text-subtle"
                      )}>
                        ?�일 ?�도: {limit.max_requests_per_day > 0 ? `${limit.max_requests_per_day}?? : "무제??}
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
            <p className="text-xs text-app-text-muted text-center py-4">?�용???�이?��? ?�습?�다</p>
          )}
        </div>
      </Panel>

      {/* Plan Limits */}
      {limits.length > 0 && (
        <Panel title="?�랜 ?�한">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border">
                  <th className="text-left py-2 px-2 text-app-text-muted font-medium">기능</th>
                  <th className="text-right py-2 px-2 text-app-text-muted font-medium">?�일 ?�청</th>
                  <th className="text-right py-2 px-2 text-app-text-muted font-medium">?�일 ?�큰</th>
                  <th className="text-right py-2 px-2 text-app-text-muted font-medium">???�레??/th>
                  <th className="text-center py-2 px-2 text-app-text-muted font-medium">?�태</th>
                </tr>
              </thead>
              <tbody>
                {limits.map(limit => (
                  <tr key={limit.id} className="border-b border-app-border/50">
                    <td className="py-2 px-2 text-app-text">
                      {FEATURE_LABELS[limit.feature] || limit.feature}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-app-text">
                      {limit.max_requests_per_day > 0 ? limit.max_requests_per_day.toLocaleString() : "??}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-app-text">
                      {limit.max_tokens_per_day > 0 ? limit.max_tokens_per_day.toLocaleString() : "??}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-app-text">
                      {limit.max_credits_per_month > 0 ? limit.max_credits_per_month : "??}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        limit.is_enabled ? "bg-app-success-muted text-app-success" : "bg-app-danger-muted text-app-danger"
                      )}>
                        {limit.is_enabled ? "?�성" : "비활??}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AiSubTabLayout>
  );
}