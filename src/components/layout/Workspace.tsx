"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TabBar } from "@/components/workspace/TabBar";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { ReplyMacroTab } from "@/components/workspace/tabs/ReplyMacroTab";
import { DashboardTab } from "@/components/workspace/tabs/DashboardTab";
import { AccountRegisterTab } from "@/components/workspace/tabs/AccountRegisterTab";
import { SendTab } from "@/components/workspace/tabs/SendTab";
import { RecurringScheduleTab } from "@/components/workspace/tabs/RecurringScheduleTab";
import { GroupTab } from "@/components/workspace/tabs/GroupTab";
import { GroupSearchTab } from "@/components/workspace/tabs/GroupSearchTab";
import { LinkInspectorTab } from "@/components/workspace/tabs/LinkInspectorTab";
import { AutoReplyTab } from "@/components/workspace/tabs/AutoReplyTab";
import { ProfileTab } from "@/components/workspace/tabs/ProfileTab";
import { LogTab } from "@/components/workspace/tabs/LogTab";
import { DeliveryAnalyticsTab } from "@/components/workspace/tabs/DeliveryAnalyticsTab";
import { ChannelHubTab } from "@/components/workspace/tabs/ChannelHubTab";
import { TemplateTab } from "@/components/workspace/tabs/TemplateTab";
import { CampaignTab } from "@/components/workspace/tabs/CampaignTab";
import { HealthTab } from "@/components/workspace/tabs/HealthTab";
import type { TabId } from "@/types";

const TAB_CONTENT: Record<TabId, React.ComponentType> = {
  dashboard: DashboardTab,
  register: AccountRegisterTab,
  send: SendTab,
  scheduler: RecurringScheduleTab,
  group: GroupTab,
  groupsearch: GroupSearchTab,
  linkinspector: LinkInspectorTab,
  autoreply: AutoReplyTab,
  replymacro: ReplyMacroTab,
  deliveryanalytics: DeliveryAnalyticsTab,
  channelhub: ChannelHubTab,
  profile: ProfileTab,
  log: LogTab,
  folders: React.lazy(() => import("@/components/workspace/tabs/FoldersTab").then(m => ({ default: m.FoldersTab }))),
  templates: TemplateTab,
  health: HealthTab,
  campaigns: CampaignTab,
};

export function Workspace() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const ActiveTabContent = TAB_CONTENT[activeTab];

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TabBar />
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ActiveTabContent />
          </motion.div>
        </AnimatePresence>
      </div>
      <CommandPalette />
    </main>
  );
}

