"use client";

import {
  LayoutDashboard, UserPlus, Send, Users, Search, CalendarClock,
  Bot, Zap, User, FileText, BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { TABS } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  register: UserPlus,
  send: Send,
  scheduler: CalendarClock,
  group: Users,
  groupsearch: Search,
  autoreply: Bot,
  replymacro: Zap,
  deliveryanalytics: BarChart3,
  profile: User,
  log: FileText,
};

export function TabBar() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-app-border/50 bg-app-surface/30 px-2 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        const Icon = TAB_ICONS[tab.id];
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
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {tab.label}
            {active && (
              <motion.span
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-app-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
