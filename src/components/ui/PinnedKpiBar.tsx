"use client";

import { useDashboardStore } from "@/stores/useDashboardStore";

interface KpiItem {
  key: string;
  label: string;
  icon: string;
  value: string | number;
}

export default function PinnedKpiBar() {
  const accounts = useDashboardStore((s) => s.accounts);
  const todaySent = useDashboardStore((s) => s.todaySent);
  const todayReceived = useDashboardStore((s) => s.todayReceived);
  const activeChats = useDashboardStore((s) => s.activeChats);
  const pendingMessages = useDashboardStore((s) => s.pendingMessages);

  const kpis: KpiItem[] = [
    { key: "accounts", label: "계정", icon: "👤", value: accounts ?? 0 },
    { key: "sent", label: "보낸 메시지", icon: "📤", value: todaySent ?? 0 },
    { key: "received", label: "받은 메시지", icon: "📥", value: todayReceived ?? 0 },
    { key: "chats", label: "활성 채팅", icon: "💬", value: activeChats ?? 0 },
    { key: "pending", label: "대기 중", icon: "⏳", value: pendingMessages ?? 0 },
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
