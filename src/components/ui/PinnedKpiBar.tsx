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
    <div className="sticky z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm"
         style={{ top: "var(--category-strip-height, 44px)" }}>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide snap-x snap-mandatory">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="flex shrink-0 snap-start items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 min-w-[120px]"
          >
            <span className="text-lg">{kpi.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">{kpi.value}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
