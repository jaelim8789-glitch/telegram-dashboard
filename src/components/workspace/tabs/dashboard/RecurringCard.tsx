"use client";

import { Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Broadcast } from "@/types";
import { getRecurringState } from "@/types";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";

export interface RecurringCardProps {
  broadcast: Broadcast;
  accounts: { id: string; name: string | null; phone: string }[];
}

export function RecurringCard({ broadcast, accounts }: RecurringCardProps) {
  const countdown = useCountdown(broadcast.nextScheduledAt);
  const account = accounts.find((a) => a.id === broadcast.accountId);
  const accLabel = account
    ? account.name?.trim() || account.phone
    : broadcast.accountId.slice(0, 8);
  const state = getRecurringState(broadcast);
  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm",
      state === "error" ? "border-app-danger/20 bg-app-danger-muted/10" :
      state === "paused" ? "border-app-warning/20 bg-app-warning-muted/10" :
      "border-app-border bg-gradient-to-r from-app-bg to-app-card hover:border-app-border-strong",
    )}>
      <div className="min-w-0 flex-1 pr-2">
        <p className="truncate text-xs font-medium text-app-text">{broadcast.message}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11px] text-app-text-subtle">
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3 text-app-info" />
            {intervalLabel(broadcast.recurringIntervalMinutes)}
          </span>
          <span>·</span>
          <span>{accLabel}</span>
          <span>·</span>
          <span>{broadcast.recipients.length}명</span>
          {countdown && (
            <span className="font-mono text-app-info flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {countdown}
            </span>
          )}
        </p>
      </div>
      <Badge tone={state === "error" ? "danger" : state === "paused" ? "warning" : state === "cancelled" ? "neutral" : "info"} className="shrink-0">
        {state === "active" ? "반복 중" : state === "paused" ? "일시 정지" : state === "cancelled" ? "취소됨" : "오류"}
      </Badge>
    </div>
  );
}
