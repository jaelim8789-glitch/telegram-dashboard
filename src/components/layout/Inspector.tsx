"use client";

import { Sparkles, Layers } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TABS, CATEGORY_META, type TabId } from "@/types";
import { DashboardInspector } from "@/components/inspector/DashboardInspector";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

const loadingComponent = () => <div className="p-4"><Skeleton className="h-32 w-full" /></div>;

const INSPECTOR_CONTENT: Record<string, React.ComponentType<any>> = {
  dashboard: dynamic(() => import("@/components/inspector/DashboardInspector").then(m => ({ default: m.DashboardInspector })), { loading: loadingComponent }),
  register: dynamic(() => import("@/components/inspector/RegisterInspector").then(m => ({ default: m.RegisterInspector })), { loading: loadingComponent }),
  send: dynamic(() => import("@/components/inspector/SendInspector").then(m => ({ default: m.SendInspector })), { loading: loadingComponent }),
  group: dynamic(() => import("@/components/inspector/GroupInspector").then(m => ({ default: m.GroupInspector })), { loading: loadingComponent }),
  groupsearch: dynamic(() => import("@/components/inspector/GroupSearchInspector").then(m => ({ default: m.GroupSearchInspector })), { loading: loadingComponent }),
  autoreply: dynamic(() => import("@/components/inspector/AutoReplyInspector").then(m => ({ default: m.AutoReplyInspector })), { loading: loadingComponent }),
  channelhub: dynamic(() => import("@/components/inspector/ChannelHubInspector").then(m => ({ default: m.ChannelHubInspector })), { loading: loadingComponent }),
  replymacro: dynamic(() => import("@/components/inspector/ReplyMacroInspector").then(m => ({ default: m.ReplyMacroInspector })), { loading: loadingComponent }),
  profile: dynamic(() => import("@/components/inspector/ProfileInspector").then(m => ({ default: m.ProfileInspector })), { loading: loadingComponent }),
  log: dynamic(() => import("@/components/inspector/LogInspector").then(m => ({ default: m.LogInspector })), { loading: loadingComponent }),
  scheduler: DashboardInspector,
  linkinspector: DashboardInspector,
  deliveryanalytics: DashboardInspector,
  folders: DashboardInspector,
  team: DashboardInspector,
  templates: DashboardInspector,
  health: DashboardInspector,
  myai: DashboardInspector,
  campaigns: DashboardInspector,
  aireply: DashboardInspector,
  aibroadcast: DashboardInspector,
  aioperations: DashboardInspector,
  aiopscenter: DashboardInspector,
  aiusage: DashboardInspector,
  guestbot: DashboardInspector,
  drafts: DashboardInspector,
  triggers: DashboardInspector,
  stars: DashboardInspector,
  apikeys: DashboardInspector,
  audit: DashboardInspector,
  referral: DashboardInspector,
  operator: DashboardInspector,
  styleprofile: DashboardInspector,
  growthloop: DashboardInspector,
  fortune: DashboardInspector,
  sendhub: DashboardInspector,
};

export function Inspector() {
  const navView = useDashboardStore((s) => s.navView);
  const navCategory = useDashboardStore((s) => s.navCategory);
  const activeTab = useDashboardStore((s) => s.activeTab);
  const ActiveInspector = INSPECTOR_CONTENT[activeTab];
  const tabLabel = TABS.find((t) => t.id === activeTab)?.label;

  const inFeature = navView === "feature";

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-app-border/50 bg-app-surface/20 max-sm:w-full max-sm:max-w-full">
      <div className="border-b border-app-border/50 px-4 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-app-text-muted">인스펙터</span>
        <div className="mt-0.5 text-sm font-medium text-app-text">
          {inFeature ? tabLabel : navView === "category" && navCategory ? CATEGORY_META[navCategory]?.label : "AI 대화"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {inFeature ? (
          <ActiveInspector />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-app-text-muted">
            {navView === "chat" ? (
              <>
                <Sparkles className="h-8 w-8 opacity-30" />
                <p className="text-xs">AI 운영 비서와 대화 중</p>
                <p className="text-[10px]">카테고리를 선택해 기능으로 이동하세요</p>
              </>
            ) : (
              <>
                <Layers className="h-8 w-8 opacity-30" />
                <p className="text-xs">
                  {navCategory ? CATEGORY_META[navCategory]?.label : ""} 카테고리 탐색 중
                </p>
                <p className="text-[10px]">원하는 기능을 선택해주세요</p>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
