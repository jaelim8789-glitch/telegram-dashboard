"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MessageSquare, Bot, Users, Sparkles, Zap, AlertTriangle, Info } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { getPlanLimits, getLimitPercent, getLimitVariant, formatLimitValue, type PlanId } from "@/lib/planLimits";
import type { DeliverySummary } from "@/types";

interface UsageProgressWidgetProps {
  planId: string;
  summary: DeliverySummary | null;
  accountsCount: number;
  autoReplyCount?: number;
  aiChatCount?: number;
  loading?: boolean;
}

interface UsageItem {
  label: string;
  used: number;
  limit: number;
  icon: React.ReactNode;
  color: string;
}

export function UsageProgressWidget({
  planId,
  summary,
  accountsCount,
  autoReplyCount = 0,
  aiChatCount = 0,
  loading,
}: UsageProgressWidgetProps) {
  const limits = useMemo(() => getPlanLimits(planId), [planId]);
  const isFree = planId === "free";

  const usageItems = useMemo<UsageItem[]>(() => {
    const items: UsageItem[] = [
      {
        label: "발송",
        used: summary?.total_attempted ?? 0,
        limit: limits.monthlyMessageLimit,
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        color: "accent",
      },
      {
        label: "자동 응답",
        used: autoReplyCount,
        limit: limits.monthlyAutoReplyLimit,
        icon: <Bot className="h-3.5 w-3.5" />,
        color: "info",
      },
      {
        label: "계정",
        used: accountsCount,
        limit: limits.maxAccounts,
        icon: <Users className="h-3.5 w-3.5" />,
        color: "success",
      },
      {
        label: "AI 채팅",
        used: aiChatCount,
        limit: limits.monthlyAiChatLimit,
        icon: <Sparkles className="h-3.5 w-3.5" />,
        color: "warning",
      },
    ];
    return items;
  }, [limits, summary, accountsCount, autoReplyCount, aiChatCount]);

  const nearLimitItems = useMemo(
    () => usageItems.filter((item) => getLimitPercent(item.used, item.limit) >= 70),
    [usageItems]
  );

  if (loading) {
    return (
      <Panel
        title={
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-app-primary" aria-hidden="true" />
            사용량 한도
          </div>
        }
        description={isFree ? "Free Plan" : `${planId === "pro" ? "Pro" : "Team"} 플랜`}
      >
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-app-card-hover animate-pulse" />
              <div className="h-2 w-full rounded-full bg-app-card-hover animate-pulse" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-app-primary" aria-hidden="true" />
          사용량 한도
        </div>
      }
      description={isFree ? "Free Plan" : `${planId === "pro" ? "Pro" : "Team"} 플랜`}
    >
      <div className="space-y-4">
        {usageItems.map((item, idx) => {
          const percent = getLimitPercent(item.used, item.limit);
          const variant = getLimitVariant(percent);
          const formattedUsed = formatLimitValue(item.used);
          const formattedLimit = formatLimitValue(item.limit);

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1.5 text-app-text-secondary">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <span className="font-medium tabular-nums">
                  {formattedUsed} / {formattedLimit}
                </span>
              </div>
              <ProgressBar value={percent} variant={variant} />
            </div>
          );
        })}
      </div>

      {nearLimitItems.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 pt-0.5" />
          <div>
            {nearLimitItems.map((item, idx) => (
              <div key={idx}>
                {item.label} 사용량이 곧 한도에 도달합니다.{" "}
                <Link href="/pricing" className="underline">
                  업그레이드
                </Link>
                를 고려해보세요.
              </div>
            ))}
          </div>
        </div>
      )}

      {isFree && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-500/10 p-3 text-xs text-blue-600">
          <Info className="h-3.5 w-3.5 shrink-0 pt-0.5" />
          <div>
            무료 플랜입니다. <Link href="/pricing" className="underline">업그레이드</Link>하시면 
            더 많은 기능과 높은 한도를 이용할 수 있으며, 발송 시 워터마크 광고가 제거됩니다.
          </div>
        </div>
      )}
    </Panel>
  );
}
