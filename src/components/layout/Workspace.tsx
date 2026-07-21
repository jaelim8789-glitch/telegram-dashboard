"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import { CategoryStrip } from "@/components/navigation/CategoryStrip";
import { CategoryDashboard } from "@/components/navigation/CategoryDashboard";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TabId } from "@/types";
import { Loader2, WifiOff } from "lucide-react";
import { updateBadgeFromStats } from "@/lib/appBadge";
import { requestPushPermission, subscribeToPush } from "@/lib/pushNotifications";

const InlineAiChat = dynamic(() => import("@/components/ai/InlineAiChat").then(m => ({ default: m.InlineAiChat })), {
  loading: () => (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  ),
});

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
  operator: dynamic(() => import("@/components/workspace/tabs/OperatorTab").then(m => ({ default: m.OperatorTab })), { loading: TabFallback }),
  styleprofile: dynamic(() => import("@/components/workspace/tabs/StyleProfileTab").then(m => ({ default: m.StyleProfileTab })), { loading: TabFallback }),
  growthloop: dynamic(() => import("@/components/workspace/tabs/GrowthLoopTab").then(m => ({ default: m.GrowthLoopTab })), { loading: TabFallback }),
  sendhub: dynamic(() => import("@/components/navigation/categories/SendHub").then(m => ({ default: m.SendHub })), { loading: TabFallback }),
};

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
      setKeyboardHeight(Math.max(0, diff - 44));
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

function navDepth(view: typeof navView): number {
  if (view === "feature") return 2;
  if (view === "category") return 1;
  return 0;
}

const viewVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

const PRELOAD_TABS: TabId[] = ["send", "group", "myai"];

export function Workspace() {
  const navView = useDashboardStore((s) => s.navView);
  const navCategory = useDashboardStore((s) => s.navCategory);
  const navFeature = useDashboardStore((s) => s.navFeature);
  const activeTab = useDashboardStore((s) => s.activeTab);

  // Init push notifications + app badge
  useEffect(() => {
    requestPushPermission().then((granted) => { if (granted) subscribeToPush(); });
    updateBadgeFromStats({ pending: 0, failed: 0, sent: 0, total: 0 }); // clear on load
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      PRELOAD_TABS.forEach((id) => {
        const loader = TAB_CONTENT[id] as any;
        if (loader?.preload) loader.preload();
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const online = useNetworkStatus();
  const reducedMotion = useReducedMotion();
  const keyboardHeight = useKeyboardAware();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const prevDepth = useRef(navDepth(navView));

  useEffect(() => {
    prevDepth.current = navDepth(navView);
  }, [navView]);

  const direction = navDepth(navView) - prevDepth.current;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const refreshKey = useRef(0);
  const [, setRefreshTick] = useState(0);

  const handleRefresh = useCallback(() => {
    refreshKey.current += 1;
    setRefreshTick(refreshKey.current);
  }, []);

  const pull = usePullToRefresh(scrollRef, handleRefresh, isMobile);

  const springCfg = reducedMotion
    ? { duration: 0 }
    : { x: { type: "spring" as const, stiffness: 380, damping: 30 }, opacity: { duration: 0.15 } };

  const viewKey = navView === "feature" ? navFeature || activeTab : navView === "category" ? `category-${navCategory}` : "chat";

  function renderContent() {
    if (navView === "chat") {
      return <InlineAiChat key={`chat-${refreshKey.current}`} />;
    }

    if (navView === "category" && navCategory) {
      return <CategoryDashboard category={navCategory} key={`category-${navCategory}-${refreshKey.current}`} />;
    }

    if (navView === "feature" && navFeature) {
      const FeatureContent = TAB_CONTENT[navFeature];
      if (FeatureContent) {
        return <FeatureContent key={`${navFeature}-${refreshKey.current}`} />;
      }
    }

    return null;
  }

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

        <CategoryStrip />
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
                onTouchStart: pull.onTouchStart,
                onTouchMove: pull.onTouchMove,
                onTouchEnd: pull.onTouchEnd,
              }
            : {})}
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
              key={viewKey}
              custom={direction}
              variants={viewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springCfg}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <CommandPalette />
        <OnboardingTour />
      </main>
    </MotionConfig>
  );
}
