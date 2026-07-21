"use client";

import React, { Suspense, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TabBar } from "@/components/workspace/TabBar";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TabId } from "@/types";

function TabFallback() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

const MOBILE_ORDER: TabId[] = [
  "dashboard", "send", "group", "log", "myai",
];

const TAB_CONTENT: Record<TabId, React.ComponentType> = {
  dashboard: dynamic(() => import("@/components/workspace/tabs/DashboardTab").then(m => ({ default: m.DashboardTab })), { loading: TabFallback }),
  register: dynamic(() => import("@/components/workspace/tabs/AccountRegisterTab").then(m => ({ default: m.AccountRegisterTab })), { loading: TabFallback }),
  send: dynamic(() => import("@/components/workspace/tabs/SendTab").then(m => ({ default: m.SendTab })), { loading: TabFallback }),
  scheduler: dynamic(() => import("@/components/workspace/tabs/RecurringScheduleTab").then(m => ({ default: m.RecurringScheduleTab })), { loading: TabFallback }),
  group: dynamic(() => import("@/components/workspace/tabs/GroupTab").then(m => ({ default: m.GroupTab })), { loading: TabFallback }),
  groupsearch: dynamic(() => import("@/components/workspace/tabs/GroupSearchTab").then(m => ({ default: m.GroupSearchTab })), { loading: TabFallback }),
  linkinspector: dynamic(() => import("@/components/workspace/tabs/LinkInspectorTab").then(m => ({ default: m.LinkInspectorTab })), { loading: TabFallback }),
  autoreply: dynamic(() => import("@/components/workspace/tabs/AutoReplyTab").then(m => ({ default: m.AutoReplyTab })), { loading: TabFallback }),
  replymacro: dynamic(() => import("@/components/workspace/tabs/ReplyMacroTab").then(m => ({ default: m.ReplyMacroTab })), { loading: TabFallback }),
  campaigns: dynamic(() => import("@/components/workspace/tabs/CampaignTab").then(m => ({ default: m.CampaignTab })), { loading: TabFallback }),
  folders: dynamic(() => import("@/components/workspace/tabs/FoldersTab").then(m => ({ default: m.FoldersTab })), { loading: TabFallback }),
  templates: dynamic(() => import("@/components/workspace/tabs/TemplateTab").then(m => ({ default: m.TemplateTab })), { loading: TabFallback }),
  health: dynamic(() => import("@/components/workspace/tabs/HealthTab").then(m => ({ default: m.HealthTab })), { loading: TabFallback }),
  myai: dynamic(() => import("@/components/workspace/tabs/MyAiTab").then(m => ({ default: m.MyAiTab })), { loading: TabFallback }),
  aireply: dynamic(() => import("@/components/workspace/tabs/AiReplyAssistantTab").then(m => ({ default: m.AiReplyAssistantTab })), { loading: TabFallback }),
  aibroadcast: dynamic(() => import("@/components/workspace/tabs/AiBroadcastAssistantTab").then(m => ({ default: m.AiBroadcastAssistantTab })), { loading: TabFallback }),
  aioperations: dynamic(() => import("@/components/workspace/tabs/AiOperationsReportTab").then(m => ({ default: m.AiOperationsReportTab })), { loading: TabFallback }),
  aiopscenter: dynamic(() => import("@/components/workspace/tabs/AiOperationsCenterTab").then(m => ({ default: m.AiOperationsCenterTab })), { loading: TabFallback }),
  aiusage: dynamic(() => import("@/components/workspace/tabs/AiUsageTab").then(m => ({ default: m.AiUsageTab })), { loading: TabFallback }),
  channelhub: dynamic(() => import("@/components/workspace/tabs/ChannelHubTab").then(m => ({ default: m.ChannelHubTab })), { loading: TabFallback }),
  team: dynamic(() => import("@/components/workspace/tabs/TeamTab").then(m => ({ default: m.TeamTab })), { loading: TabFallback }),
  profile: dynamic(() => import("@/components/workspace/tabs/ProfileTab").then(m => ({ default: m.ProfileTab })), { loading: TabFallback }),
  log: dynamic(() => import("@/components/workspace/tabs/LogTab").then(m => ({ default: m.LogTab })), { loading: TabFallback }),
  deliveryanalytics: dynamic(() => import("@/components/workspace/tabs/DeliveryAnalyticsTab").then(m => ({ default: m.DeliveryAnalyticsTab })), { loading: TabFallback }),
  guestbot: dynamic(() => import("@/components/workspace/tabs/GuestBotTab").then(m => ({ default: m.GuestBotTab })), { loading: TabFallback }),
  drafts: dynamic(() => import("@/components/workspace/tabs/DraftsTab").then(m => ({ default: m.DraftsTab })), { loading: TabFallback }),
  triggers: dynamic(() => import("@/components/workspace/tabs/TriggersTab").then(m => ({ default: m.TriggersTab })), { loading: TabFallback }),
  stars: dynamic(() => import("@/components/workspace/tabs/StarsTab"), { loading: TabFallback }),
  apikeys: dynamic(() => import("@/components/workspace/tabs/ApiKeyManagerTab").then(m => ({ default: m.ApiKeyManagerTab })), { loading: TabFallback }),
  audit: dynamic(() => import("@/components/workspace/tabs/ActivityAuditTab").then(m => ({ default: m.ActivityAuditTab })), { loading: TabFallback }),
};

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 60) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchCurrent = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchCurrent.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrent.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
    touchCurrent.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// Direction-aware tab transition variants (iOS style push/pop)
const tabVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.97,
  }),
};

function useTabDirection() {
  const prevRef = useRef<string | null>(null);
  return useCallback((tab: string) => {
    const prev = prevRef.current;
    prevRef.current = tab;
    if (prev === null) return 0;
    const prevIdx = MOBILE_ORDER.indexOf(prev as TabId);
    const currIdx = MOBILE_ORDER.indexOf(tab as TabId);
    if (prevIdx === -1 || currIdx === -1) return 0;
    return currIdx - prevIdx;
  }, []);
}

export function Workspace() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const ActiveTabContent = TAB_CONTENT[activeTab];
  const haptics = useHapticFeedback();
  const getDirection = useTabDirection();
  const direction = getDirection(activeTab);

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
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 380, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
          >
            <ActiveTabContent />
          </motion.div>
        </AnimatePresence>
      </div>
      <CommandPalette />
      <OnboardingTour />
    </main>
  );
}
