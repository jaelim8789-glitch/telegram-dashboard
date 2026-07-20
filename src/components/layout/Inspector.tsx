"use client";

import { useDashboardStore } from "@/store/useDashboardStore";
import { TABS, type TabId } from "@/types";
import { DashboardInspector } from "@/components/inspector/DashboardInspector";
import { RegisterInspector } from "@/components/inspector/RegisterInspector";
import { SendInspector } from "@/components/inspector/SendInspector";
import { GroupInspector } from "@/components/inspector/GroupInspector";
import { GroupSearchInspector } from "@/components/inspector/GroupSearchInspector";
import { AutoReplyInspector } from "@/components/inspector/AutoReplyInspector";
import { ChannelHubInspector } from "@/components/inspector/ChannelHubInspector";
import { ReplyMacroInspector } from "@/components/inspector/ReplyMacroInspector";
import { ProfileInspector } from "@/components/inspector/ProfileInspector";
import { LogInspector } from "@/components/inspector/LogInspector";

const INSPECTOR_CONTENT: Record<TabId, React.ComponentType> = {
  dashboard: DashboardInspector,
  register: RegisterInspector,
  send: SendInspector,
  scheduler: DashboardInspector,
  group: GroupInspector,
  groupsearch: GroupSearchInspector,
  linkinspector: DashboardInspector,
  autoreply: AutoReplyInspector,
  replymacro: ReplyMacroInspector,
  channelhub: ChannelHubInspector,
  deliveryanalytics: DashboardInspector,
  profile: ProfileInspector,
  log: LogInspector,
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
};

export function Inspector() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const ActiveInspector = INSPECTOR_CONTENT[activeTab];
  const tabLabel = TABS.find((t) => t.id === activeTab)?.label;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-app-border/50 bg-app-surface/20 max-sm:w-full max-sm:max-w-full">
      <div className="border-b border-app-border/50 px-4 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-app-text-muted">인스펙터</span>
        <div className="mt-0.5 text-sm font-medium text-app-text">{tabLabel}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <ActiveInspector />
      </div>
    </aside>
  );
}
