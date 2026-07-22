"use client";

import { useState, useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useNavHistory } from "@/store/useNavHistory";

type FilterValue = "all" | "sent" | "failed" | "pending" | "scheduled";

interface FilterChip { id: FilterValue; label: string; }

export function useQuickFilter(initial: FilterValue = "all") {
  const [filter, setFilter] = useState<FilterValue>(initial);
  const chips: FilterChip[] = [
    { id: "all", label: "전체" },
    { id: "sent", label: "성공" },
    { id: "failed", label: "실패" },
    { id: "pending", label: "대기" },
    { id: "scheduled", label: "예약" },
  ];

  const apply = useCallback((items: { status?: string }[]) => {
    if (filter === "all") return items;
    return items.filter(item => {
      if (filter === "sent") return item.status === "sent";
      if (filter === "failed") return item.status === "failed";
      if (filter === "pending") return item.status === "pending" || item.status === "sending";
      if (filter === "scheduled") return item.status === "scheduled";
      return true;
    });
  }, [filter]);

  return { filter, setFilter, chips, apply };
}

export function QuickFilterBar({ chips, current, onChange }: { chips: FilterChip[]; current: string; onChange: (id: FilterValue) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2" style={{ scrollbarWidth: "none" }}>
      {chips.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${c.id === current ? "bg-app-primary text-white" : "border border-app-border text-app-text-muted hover:text-app-text"}`}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
