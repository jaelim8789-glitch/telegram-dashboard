"use client";

import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Panel } from "@/components/ui/Panel";
import { RecurringCard } from "@/components/workspace/tabs/dashboard/RecurringCard";
import type { Broadcast, TabId } from "@/types";

export interface BroadcastListSectionProps {
  title: React.ReactNode;
  items: Broadcast[];
  accounts: { id: string; name: string | null; phone: string }[];
  dataLoading: boolean;
  emptyIcon: React.ReactNode;
  emptyMessage: string;
  max?: number;
  onViewAll?: (tab: TabId) => void;
  viewAllTab?: TabId;
}

export function BroadcastListSection({
  title, items, accounts, dataLoading, emptyIcon, emptyMessage,
  max = 5, onViewAll, viewAllTab = "scheduler",
}: BroadcastListSectionProps) {
  return (
    <Panel title={title} className="lg:col-span-1">
      {dataLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          {emptyIcon}
          <p className="text-xs text-app-text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, max).map((b) => (
            <RecurringCard key={b.id} broadcast={b} accounts={accounts} />
          ))}
          {items.length > max && onViewAll && (
            <button onClick={() => onViewAll(viewAllTab)}
              className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
              전체 {items.length}개 보기
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}
