"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { initData, useSignal, backButton, hapticFeedback } from "@tma.js/sdk-react";
import dynamic from "next/dynamic";
import { RefreshCw, Wifi, WifiOff, Bell, History } from "lucide-react";
import { MiniAppNav, type MiniAppTab } from "./MiniAppNav";
import { MiniAppDashboard } from "./MiniAppDashboard";
import { MiniAppSend } from "./MiniAppSend";
import { MiniAppHistory } from "./MiniAppHistory";
import { MiniAppNotifications } from "./MiniAppNotifications";
import { MiniAppOnboarding } from "./MiniAppOnboarding";
import { ThemeQuickToggle } from "@/components/ui/ThemeQuickToggle";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const MiniAppChat = dynamic(() => import("./MiniAppChat").then((m) => ({ default: m.MiniAppChat })), {
  loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" /></div>,
});

const MiniAppProfile = dynamic(() => import("./MiniAppProfile").then((m) => ({ default: m.MiniAppProfile })), {
  loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" /></div>,
});

const TAB_ORDER: MiniAppTab[] = ["dashboard", "chat", "send", "profile"];
type SubView = "history" | "notifications" | null;

export default function MiniAppPage() {
  const [activeTab, setActiveTab] = useState<MiniAppTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [subView, setSubView] = useState<SubView>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const user = useSignal(initData.state)?.user;
  const setOpen = useCommandPaletteStore(s => s.setOpen);
  const { isOnline: online } = useNetworkStatus();

  const handleRefresh = useCallback(() => {
    try { hapticFeedback.impactOccurred("medium"); } catch {}
    setRefreshKey(k => k + 1);
  }, []);

  useKeyboardShortcut("k", () => setOpen(true), { ctrl: true });

  useEffect(() => {
    try {
      backButton.mount();
      const off = backButton.onClick(() => {
        if (subView) { setSubView(null); return; }
        if (activeTab !== "dashboard") setActiveTab("dashboard");
      });
      return () => { off(); try { backButton.unmount(); } catch {} };
    } catch { return; }
  }, [activeTab, subView]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { mainButton } = await import("@tma.js/sdk-react");
        if (cancelled) return;
        mainButton.mount();
        mainButton.setParams({ text: "새로고침", isEnabled: true, isVisible: false });
        off = mainButton.onClick(handleRefresh);
      } catch {}
    })();
    return () => { cancelled = true; if (off) off(); };
  }, [handleRefresh]);

  useEffect(() => {
    function handleTabChange(e: CustomEvent) {
      const tab = e.detail.tab;
      if (tab === "history") { setSubView("history"); return; }
      if (tab === "notifications") { setSubView("notifications"); return; }
      setActiveTab(tab);
    }
    window.addEventListener("telemon-miniapp-tab-change" as any, handleTabChange as any);
    return () => window.removeEventListener("telemon-miniapp-tab-change" as any, handleTabChange as any);
  }, []);

  useEffect(() => {
    const done = localStorage.getItem("telemon-onboarding-done");
    if (!done) setShowOnboarding(true);
  }, []);

  const handleSwipe = useCallback((_e: any, info: { offset: { x: number } }) => {
    if (subView) return;
    if (Math.abs(info.offset.x) < 50) return;
    const idx = TAB_ORDER.indexOf(activeTab);
    const dir = info.offset.x > 0 ? -1 : 1;
    const next = TAB_ORDER[idx + dir];
    if (next) { setActiveTab(next); try { hapticFeedback.impactOccurred("light"); } catch {} }
  }, [activeTab, subView]);

  const greeting = user?.first_name ? `${user.first_name}님` : "TeleMon";

  const headerVisible = activeTab === "dashboard" && !subView;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)", color: "var(--tg-theme-text-color, #f5f5f5)" }}>
      {headerVisible && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)", borderBottom: "1px solid var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <div className="flex flex-col">
            <span className="text-base font-bold">{greeting}</span>
            <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>TeleMon · Ctrl+K 검색</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSubView("history")} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} aria-label="발송 내역">
              <History className="h-4 w-4" />
            </button>
            <button onClick={() => setSubView("notifications")} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} aria-label="알림">
              <Bell className="h-4 w-4" />
            </button>
            <ThemeQuickToggle />
            {online ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-red-500" />}
            <button onClick={handleRefresh} className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} aria-label="새로고침">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {subView === "history" && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)", borderBottom: "1px solid var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <button onClick={() => setSubView(null)} className="text-xs font-medium active:scale-90" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>← 뒤로</button>
          <span className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>발송 내역</span>
        </div>
      )}
      {subView === "notifications" && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)", borderBottom: "1px solid var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <button onClick={() => setSubView(null)} className="text-xs font-medium active:scale-90" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>← 뒤로</button>
          <span className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>알림</span>
        </div>
      )}

      <motion.div
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipe}
      >
        <ErrorBoundary>
          {activeTab === "dashboard" && !subView && <MiniAppDashboard key={`dash-${refreshKey}`} />}
        </ErrorBoundary>
        <ErrorBoundary>
          {subView === "history" && <MiniAppHistory />}
        </ErrorBoundary>
        <ErrorBoundary>
          {subView === "notifications" && <MiniAppNotifications />}
        </ErrorBoundary>
        <ErrorBoundary>
          {activeTab === "chat" && <MiniAppChat />}
        </ErrorBoundary>
        <ErrorBoundary>
          {activeTab === "send" && <MiniAppSend user={user} />}
        </ErrorBoundary>
        <ErrorBoundary>
          {activeTab === "profile" && <MiniAppProfile />}
        </ErrorBoundary>
      </motion.div>

      <MiniAppNav activeTab={activeTab} onTabChange={setActiveTab} />

      {showOnboarding && (
        <MiniAppOnboarding onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
