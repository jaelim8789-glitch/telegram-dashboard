"use client";

import { memo } from "react";
import { LayoutDashboard, MessageSquare, Send, User } from "lucide-react";

export type MiniAppTab = "dashboard" | "chat" | "send" | "profile";

interface MiniAppNavProps {
  activeTab: MiniAppTab;
  onTabChange: (tab: MiniAppTab) => void;
  unreadCount?: number;
  lastUpdated?: string;
}

const TABS: { id: MiniAppTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "chat", label: "AI 채팅", icon: MessageSquare },
  { id: "send", label: "발송", icon: Send },
  { id: "profile", label: "프로필", icon: User },
];

export const MiniAppNav = memo(function MiniAppNav({ activeTab, onTabChange, unreadCount }: MiniAppNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-1 pt-1.5"
      role="tablist"
      aria-label="메인 내비게이션"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)",
        backgroundColor: "var(--tg-theme-bg-color, #17212b)",
        borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={() => onTabChange(tab.id)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] transition-all active:scale-90"
            style={{
              color: isActive
                ? "var(--tg-theme-button-color, #5288c1)"
                : "var(--tg-theme-hint-color, #708499)",
            }}
          >
            <div className="relative flex items-center justify-center h-6 w-6">
              <Icon className={isActive ? "h-5 w-5" : "h-5 w-5"} />
              {tab.id === "chat" && unreadCount && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${isActive ? "opacity-100" : "opacity-60"}`}>{tab.label}</span>
            {isActive && (
              <span
                className="absolute -top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
});
