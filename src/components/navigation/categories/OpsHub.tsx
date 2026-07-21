"use client";

import { BarChart3, ScanSearch, UserPlus, Users, Search, Bot, Globe, ArrowRight } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TABS, type TabId } from "@/types";
import { cn } from "@/lib/cn";

const OPS_FEATURES: TabId[] = ["deliveryanalytics", "linkinspector", "register", "group", "groupsearch", "autoreply", "channelhub"];

const FEATURE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string; color: string }> = {
  deliveryanalytics: { icon: BarChart3, desc: "발송 성공률 및 지연 분석", color: "text-blue-500" },
  linkinspector: { icon: ScanSearch, desc: "발송 링크 추적 및 검사", color: "text-purple-500" },
  register: { icon: UserPlus, desc: "새 텔레그램 계정 등록", color: "text-emerald-500" },
  group: { icon: Users, desc: "계정별 그룹 목록 관리", color: "text-amber-500" },
  groupsearch: { icon: Search, desc: "그룹 검색 및 탐색", color: "text-rose-500" },
  autoreply: { icon: Bot, desc: "키워드 기반 자동 응답", color: "text-green-500" },
  channelhub: { icon: Globe, desc: "채널 통합 관리", color: "text-indigo-500" },
};

export function OpsHub() {
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);
  const accounts = useDashboardStore((s) => s.accounts);
  const opsTabs = TABS.filter((t) => OPS_FEATURES.includes(t.id));

  const healthyAccounts = accounts.filter((a) => a.status === "active").length;
  const totalAccounts = accounts.length;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-app-text">운영</h2>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-app-border/50 bg-emerald-500/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-emerald-500">{healthyAccounts}</p>
          <p className="text-[10px] text-app-text-muted">활성 계정</p>
        </div>
        <div className="rounded-xl border border-app-border/50 bg-blue-500/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-blue-500">{totalAccounts}</p>
          <p className="text-[10px] text-app-text-muted">전체 계정</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">운영 기능</p>
        {opsTabs.map((tab) => {
          const meta = FEATURE_META[tab.id];
          const Icon = meta?.icon || BarChart3;
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
