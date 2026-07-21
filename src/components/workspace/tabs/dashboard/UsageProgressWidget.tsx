"use client";

import { useMemo } from "react";
import { MessageSquare, Bot, Users, Sparkles, Zap } from "lucide-react";
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
        description={isFree ? "Free 플랜" : `${planId === "pro" ? "Pro" : "Team"} 플랜`}
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
      description={`${(planId === "free" ? "Free" : planId === "pro" ? "Pro" : "Team").toUpperCase()}${nearLimitItems.length > 0 ? ` · ${nearLimitItems.length}개 항목 임박` : ""}`}
    >
      <div className="space-y-3">
        {usageItems.map((item) => {
          const percent = getLimitPercent(item.used, item.limit);
          const variant = getLimitVariant(percent) as "success" | "warning" | "danger";
          const nearLimit = percent >= 70;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-app-text">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn(
                    "tabular-nums font-medium",
                    variant === "danger" && "text-app-danger",
                    variant === "warning" && "text-app-warning",
                    variant === "success" && "text-app-text"
                  )}>
                    {formatLimitValue(item.used)}
                  </span>
                  <span className="text-app-text-subtle">
                    / {formatLimitValue(item.limit)}
                  </span>
                  {nearLimit && (
                    <span className={cn(
                      "text-[10px] font-medium",
                      variant === "danger" ? "text-app-danger" : "text-app-warning"
                    )}>
                      {percent}%
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar
                value={item.used}
                max={item.limit}
                size="sm"
                variant={variant}
                animated
              />
            </div>
          );
        })}

        {isFree && (
          <div className="mt-2 rounded-xl border border-app-primary/20 bg-app-primary-muted/10 p-2.5">
            <p className="text-[11px] font-medium text-app-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Pro로 업그레이드
            </p>
            <p className="text-[10px] text-app-text-muted mt-0.5">
              계정 10개, 월 50,000건 발송, 이미지 첨부 및 예약 발송 지원
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
