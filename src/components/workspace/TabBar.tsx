"use client";

import { motion } from "framer-motion";
import { TABS } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

const TAB_ICONS: Record<string, string> = {
  dashboard: "📊", register: "📝", send: "📨", group: "👥", groupsearch: "🔍",
  autoreply: "🤖", replymacro: "⚡", profile: "👤", log: "📊",
};

export function TabBar() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-app-border/50 bg-app-surface/30 px-2 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "tab-premium relative flex items-center gap-1.5 whitespace-nowrap",
              active && "active"
            )}
          >
            <span className="text-xs">{TAB_ICONS[tab.id] || "•"}</span>
            {tab.label}
            {active && (
              <motion.span
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
