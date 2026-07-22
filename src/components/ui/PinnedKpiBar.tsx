"use client";

import { useDashboardStore } from "@/store/useDashboardStore";

interface KpiItem {
  key: string;
  label: string;
  icon: string;
  value: string | number;
}

export default function PinnedKpiBar() {
  const accounts = useDashboardStore((s) => s.accounts);

  const kpis: KpiItem[] = [
    { key: "accounts", label: "계정", icon: "👤", value: accounts.length },
  ];

  return (
    <div className="sticky z-10 border-b border-app-border bg-app-surface/95 backdrop-blur-sm"
         style={{ top: "var(--category-strip-height, 44px)" }}>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide snap-x snap-mandatory">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="flex shrink-0 snap-start items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2 min-w-[120px]"
          >
            <span className="text-lg">{kpi.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-app-text">{kpi.value}</span>
              <span className="text-xs text-app-text-muted whitespace-nowrap">{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
