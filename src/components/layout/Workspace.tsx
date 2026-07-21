"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TabBar } from "@/components/workspace/TabBar";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TabId } from "@/types";
import { Loader2, WifiOff } from "lucide-react";

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
  "myai", "send", "group",
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
  referral: dynamic(() => import("@/components/workspace/tabs/ReferralTab").then(m => ({ default: m.ReferralTab })), { loading: TabFallback }),
};

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 60) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchMove = useCallback((_e: React.TouchEvent) => {}, []);

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

// ── Network status hook ──
function useNetworkStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const go = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", go);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", go);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

// ── Reduced motion hook ──
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// ── Keyboard-aware viewport hook ──
function useKeyboardAware(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;

    function update() {
      const diff = window.innerHeight - vv!.height;
      setKeyboardHeight(Math.max(0, diff - 44)); // 44 = rough URL bar
    }
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return keyboardHeight;
}

// ── Pull-to-refresh hook ──
function usePullToRefresh(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  onRefresh: () => void,
  enabled = true,
) {
  const [pulling, setPulling] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const THRESHOLD = 60;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || !scrollRef.current) return;
    if (scrollRef.current.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || touchStartY.current === 0 || refreshing) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 5) {
      setPulling(true);
      setPullDist(Math.min(dy * 0.5, 100));
    }
  }, [enabled, refreshing]);

  const onTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (!enabled) return;
    if (pullDist > THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDist(0);
      onRefresh();
      setTimeout(() => { setRefreshing(false); setPulling(false); }, 1500);
    } else {
      setPulling(false);
      setPullDist(0);
    }
    touchStartY.current = 0;
  }, [enabled, pullDist, refreshing, onRefresh]);

  return { pulling, pullDist, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}

export function Workspace() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const ActiveTabContent = TAB_CONTENT[activeTab];
  const haptics = useHapticFeedback();
  const getDirection = useTabDirection();
  const direction = getDirection(activeTab);

  const online = useNetworkStatus();
  const reducedMotion = useReducedMotion();
  const keyboardHeight = useKeyboardAware();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Pull-to-refresh callback — re-renders the current tab
  const refreshKey = useRef(0);
  const [, setRefreshTick] = useState(0);

  const handleRefresh = useCallback(() => {
    refreshKey.current += 1;
    setRefreshTick(refreshKey.current);
  }, []);

  const pull = usePullToRefresh(scrollRef, handleRefresh, isMobile);

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

  const springCfg = reducedMotion
    ? { duration: 0 }
    : { x: { type: "spring" as const, stiffness: 380, damping: 30 }, opacity: { duration: 0.2 }, scale: { duration: 0.2 } };

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Network offline strip ── */}
        <AnimatePresence>
          {!online && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden bg-app-danger/10 border-b border-app-danger/20"
            >
              <div className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-medium text-app-danger">
                <WifiOff className="h-3.5 w-3.5" />
                오프라인 상태 — 네트워크 연결을 확인해주세요
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TabBar />
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:pb-4"
          style={{
            paddingBottom: isMobile
              ? `max(5rem, calc(5rem + ${keyboardHeight}px))`
              : undefined,
          }}
          {...(isMobile
            ? {
                onTouchStart: (e: React.TouchEvent) => { swipe.onTouchStart(e); pull.onTouchStart(e); },
                onTouchMove: (e: React.TouchEvent) => { swipe.onTouchMove(e); pull.onTouchMove(e); },
                onTouchEnd: (e: React.TouchEvent) => { swipe.onTouchEnd(e); pull.onTouchEnd(e); },
              }
            : swipe
          )}
        >
          {/* ── Pull-to-refresh indicator ── */}
          {pull.pulling && (
            <motion.div
              className="flex items-center justify-center pb-2"
              animate={{ opacity: pull.pullDist > 30 ? 1 : 0.5 }}
            >
              <motion.div
                className="flex items-center gap-2 text-xs text-app-text-muted"
                animate={{ scale: pull.pullDist > 50 ? 1.1 : 1 }}
              >
                {pull.refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-app-primary" />
                    새로고침 중...
                  </>
                ) : (
                  <>
                    <Loader2
                      className="h-4 w-4 text-app-text-muted"
                      style={{ transform: `rotate(${Math.min(pull.pullDist * 3, 360)}deg)` }}
                    />
                    {pull.pullDist > 50 ? "놓으면 새로고침" : "아래로 당겨서 새로고침"}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          <ScrollToTop />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springCfg}
            >
              <ActiveTabContent key={`${activeTab}-${refreshKey.current}`} />
            </motion.div>
          </AnimatePresence>
        </div>
        <CommandPalette />
        <OnboardingTour />
      </main>
    </MotionConfig>
  );
}
