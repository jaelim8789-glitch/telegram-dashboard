"use client";

import { useState, useCallback, useEffect } from "react";
import { initData, useSignal, backButton, hapticFeedback } from "@tma.js/sdk-react";
import { MiniAppNav, type MiniAppTab } from "./MiniAppNav";
import { MiniAppChat } from "./MiniAppChat";
import { MiniAppProfile } from "./MiniAppProfile";
import { MiniAppDashboard } from "./MiniAppDashboard";

export default function MiniAppPage() {
  const [activeTab, setActiveTab] = useState<MiniAppTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const initDataState = useSignal(initData.state);
  const user = initDataState?.user;

  const handleRefresh = useCallback(() => {
    try { hapticFeedback.impactOccurred("medium"); } catch {}
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    try {
      backButton.mount();
      const off = backButton.onClick(() => {
        if (activeTab !== "dashboard") {
          setActiveTab("dashboard");
        }
      });
      return () => {
        off();
        try { backButton.unmount(); } catch {}
      };
    } catch {
      return undefined;
    }
  }, [activeTab]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { mainButton } = await import("@tma.js/sdk-react");
        if (cancelled) return;
        mainButton.mount();
        mainButton.setParams({
          text: "새로고침",
          isEnabled: true,
          isVisible: activeTab === "dashboard",
        });
        off = mainButton.onClick(handleRefresh);
      } catch {}
    })();

    return () => {
      cancelled = true;
      if (off) off();
    };
  }, [activeTab, handleRefresh]);

  const greeting = user ? user.first_name + "님, 환영합니다" : "TeleMon";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #17212b)",
        color: "var(--tg-theme-text-color, #f5f5f5)",
      }}
    >
      {activeTab === "dashboard" && (
        <div
          className="sticky top-0 z-10 flex items-center justify-center py-2"
          style={{
            backgroundColor: "var(--tg-theme-bg-color, #17212b)",
            color: "var(--tg-theme-hint-color, #708499)",
          }}
        >
          <span className="text-[10px]">{greeting}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-[72px]">
        {activeTab === "dashboard" && <MiniAppDashboard key={`dash-${refreshKey}`} />}
        {activeTab === "chat" && <MiniAppChat key={`chat-${refreshKey}`} />}
        {activeTab === "send" && (
          <div className="p-4 text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            <p className="text-sm">빠른 발송 기능</p>
            <p className="text-xs mt-2">웹 대시보드에서 전체 기능을 이용하세요</p>
          </div>
        )}
        {activeTab === "profile" && <MiniAppProfile key={`profile-${refreshKey}`} />}
      </div>

      <MiniAppNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
