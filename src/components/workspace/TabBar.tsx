"use client";

import { motion } from "framer-motion";
import { TABS } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

export function TabBar() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-app-border bg-app-bg px-3">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              active ? "text-app-text" : "text-app-text-subtle hover:text-app-text-muted"
            )}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-app-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
