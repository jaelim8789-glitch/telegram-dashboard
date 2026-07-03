"use client";

import { TABS } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

export function TabBar() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-3">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-sky-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
