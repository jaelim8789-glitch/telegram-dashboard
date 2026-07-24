"use client";

import { useState, useCallback, useEffect, useRef } from "react";
let initData: any, useSignal: any, backButton: any, hapticFeedback: any;
if (typeof window !== "undefined") {
  const tma = require("@tma.js/sdk-react");
  initData = tma.initData;
  useSignal = tma.useSignal;
  backButton = tma.backButton;
  hapticFeedback = tma.hapticFeedback;
}
import nextDynamic from "next/dynamic";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { MiniAppNav, type MiniAppTab } from "./MiniAppNav";
import { MiniAppDashboard } from "./MiniAppDashboard";
import { MiniAppSend } from "./MiniAppSend";
import { ThemeQuickToggle } from "@/components/ui/ThemeQuickToggle";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { ConnectionStatusCard } from "@/components/ui/ConnectionStatusCard";
import { useAutoDraft } from "@/hooks/useAutoDraft";

const MiniAppChat = nextDynamic(() => import("./MiniAppChat").then((m) => ({ default: m.MiniAppChat })), {
  loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" /></div>,
});

const MiniAppProfile = nextDynamic(() => import("./MiniAppProfile").then((m) => ({ default: m.MiniAppProfile })), {
  loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" /></div>,
});

const MiniAppPixelOffice = nextDynamic(() => import("./MiniAppPixelOffice").then((m) => ({ default: m.MiniAppPixelOffice })), {
  loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" /></div>,
});

const MiniAppReplyMacro = nextDynamic(() => import("./MiniAppReplyMacro").then((m) => ({ default: m.MiniAppReplyMacro })), {
  loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" /></div>,
});

export const dynamic = "force-dynamic";

export default function MiniAppPage() {
  const [activeTab, setActiveTab] = useState<MiniAppTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [online, setOnline] = useState(true);
  const initDataState = useSignal(initData.state);
  const user = initDataState?.user;
  const setOpen = useCommandPaletteStore(s => s.setOpen);

  const handleRefresh = useCallback(() => {
    try { hapticFeedback.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in page', e) }
    setRefreshKey((k) => k + 1);
    setLastUpdated(new Date());
  }, []);

  useKeyboardShortcut("k", () => setOpen(true), { ctrl: true });

  useEffect(() => {
    let off: (() => void) | undefined;
    try {
      backButton.mount();
      off = backButton.onClick(() => {
        if (activeTab !== "dashboard") setActiveTab("dashboard");
      });
    } catch (e) { console.warn('Unhandled error in page', e) }
    return () => {
      if (off) off();
      try { backButton.unmount(); } catch (e) { console.warn('Unhandled error in page', e) }
    };
  }, []);

  useEffect(() => {
    let off: (() => void) | undefined; let cancelled = false;
    (async () => {
      try {
        const { mainButton } = await import("@tma.js/sdk-react");
        if (cancelled) return;
        mainButton.mount();
        mainButton.setParams({ text: "?�로고침", isEnabled: true, isVisible: false });
        off = mainButton.onClick(handleRefresh);
      } catch (e) { console.warn('Unhandled error in page', e) }
    })();
    return () => { cancelled = true; if (off) off(); };
  }, [handleRefresh]);

  useEffect(() => {
    const validTabs: MiniAppTab[] = ["dashboard", "chat", "send", "profile"];
    function handleTabChange(e: CustomEvent) {
      const tab = e.detail.tab;
      if (typeof tab === "string" && validTabs.includes(tab as MiniAppTab)) {
        setActiveTab(tab as MiniAppTab);
      }
    }
    window.addEventListener("telemon-miniapp-tab-change" as any, handleTabChange as any);
    return () => window.removeEventListener("telemon-miniapp-tab-change" as any, handleTabChange as any);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true); const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const greeting = user ? user.first_name + "?? : "TeleMon";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)", color: "var(--tg-theme-text-color, #f5f5f5)" }}>
      {activeTab === "dashboard" && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)", borderBottom: "1px solid var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <div className="flex flex-col">
            <span className="text-base font-bold">{greeting}</span>
            <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>TeleMon · Ctrl+K 검??/span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeQuickToggle />
            {online ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-red-500" />}
            <button onClick={handleRefresh} className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} aria-label="?�로고침">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom) + 68px)" }}>
        {activeTab === "dashboard" && <MiniAppDashboard key={`dash-${refreshKey}`} />}
        {activeTab === "chat" && <MiniAppChat key={`chat-${refreshKey}`} />}
        {activeTab === "send" && <MiniAppSend key={`send-${refreshKey}`} user={user} />}
        {activeTab === "profile" && <MiniAppProfile key={`profile-${refreshKey}`} />}
        {activeTab === "pixeloffice" && <MiniAppPixelOffice key={`pixeloffice-${refreshKey}`} />}
        {activeTab === "replymacro" && <MiniAppReplyMacro key={`replymacro-${refreshKey}`} />}
      </div>

      <MiniAppNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
