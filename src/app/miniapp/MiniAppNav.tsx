"use client";

import { LayoutDashboard, MessageSquare, Send, User } from "lucide-react";

export type MiniAppTab = "dashboard" | "chat" | "send" | "profile";

interface MiniAppNavProps {
  activeTab: MiniAppTab;
  onTabChange: (tab: MiniAppTab) => void;
  unreadCount?: number;
}

const TABS: { id: MiniAppTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "chat", label: "AI 채팅", icon: MessageSquare },
  { id: "send", label: "발송", icon: Send },
  { id: "profile", label: "프로필", icon: User },
];

export function MiniAppNav({ activeTab, onTabChange, unreadCount }: MiniAppNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-2 pt-2" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}
      style={{
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
            onClick={() => onTabChange(tab.id)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1 min-w-[64px] transition-colors"
            style={{
              color: isActive
                ? "var(--tg-theme-button-color, #5288c1)"
                : "var(--tg-theme-hint-color, #708499)",
            }}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {tab.id === "chat" && unreadCount && unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {isActive && (
              <span
                className="absolute -top-[1px] left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
