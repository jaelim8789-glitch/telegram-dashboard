"use client";

import React, { useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TabBar } from "@/components/workspace/TabBar";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { MyAiTab } from "@/components/workspace/tabs/MyAiTab";
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
import { HealthTab } from "@/components/workspace/tabs/HealthTab";
import { TeamTab } from "@/components/workspace/tabs/TeamTab";
import { ReplyMacroTab } from "@/components/workspace/tabs/ReplyMacroTab";
import { AiReplyAssistantTab } from "@/components/workspace/tabs/AiReplyAssistantTab";
import { AiBroadcastAssistantTab } from "@/components/workspace/tabs/AiBroadcastAssistantTab";
import { AiOperationsReportTab } from "@/components/workspace/tabs/AiOperationsReportTab";
import { AiOperationsCenterTab } from "@/components/workspace/tabs/AiOperationsCenterTab";
import { CampaignTab } from "@/components/workspace/tabs/CampaignTab";
import { AiUsageTab } from "@/components/workspace/tabs/AiUsageTab";
import { GuestBotTab } from "@/components/workspace/tabs/GuestBotTab";
import { DraftsTab } from "@/components/workspace/tabs/DraftsTab";
import StarsTab from "@/components/workspace/tabs/StarsTab";
import type { TabId } from "@/types";

const MOBILE_ORDER: TabId[] = [
  "dashboard", "send", "group", "log", "myai",
];

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
  campaigns: CampaignTab,
  folders: React.lazy(() => import("@/components/workspace/tabs/FoldersTab").then(m => ({ default: m.FoldersTab }))),
  templates: TemplateTab,
  health: HealthTab,
  myai: MyAiTab,
  aireply: AiReplyAssistantTab,
  aibroadcast: AiBroadcastAssistantTab,
  aioperations: AiOperationsReportTab,
  aiopscenter: AiOperationsCenterTab,
  aiusage: AiUsageTab,
  channelhub: ChannelHubTab,
  team: TeamTab,
  profile: ProfileTab,
  log: LogTab,
  deliveryanalytics: DeliveryAnalyticsTab,
  guestbot: GuestBotTab,
  drafts: DraftsTab,
  triggers: React.lazy(() => import("@/components/workspace/tabs/TriggersTab").then(m => ({ default: m.TriggersTab }))),
  stars: StarsTab,
};

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 60) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx > 0) onSwipeRight();
      else onSwipeLeft();
    }
    touchStart.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}

export function Workspace() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const ActiveTabContent = TAB_CONTENT[activeTab];
  const haptics = useHapticFeedback();

  const swipe = useSwipe(
    useCallback(() => {
      const idx = MOBILE_ORDER.indexOf(activeTab);
      if (idx < MOBILE_ORDER.length - 1) {
        haptics.selection();
        setActiveTab(MOBILE_ORDER[idx + 1]);
      }
    }, [activeTab, setActiveTab, haptics]),
    useCallback(() => {
      const idx = MOBILE_ORDER.indexOf(activeTab);
      if (idx > 0) {
        haptics.selection();
        setActiveTab(MOBILE_ORDER[idx - 1]);
      }
    }, [activeTab, setActiveTab, haptics]),
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TabBar />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4" {...swipe}>
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveTabContent />
          </motion.div>
        </AnimatePresence>
      </div>
      <CommandPalette />
    </main>
  );
}
