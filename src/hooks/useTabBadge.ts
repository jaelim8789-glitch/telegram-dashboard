"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useTabBadge() {
  const accounts = useDashboardStore(s => s.accounts);
  const errorCount = useCallback(() => accounts.filter(a => a.status === "error" || a.status === "banned").length, [accounts]);
  const queueCount = useCallback(() => accounts.filter(a => a.status === "pending").length, [accounts]);
  const todayTotal = useCallback(() => accounts.reduce((s, a) => s + (a.todaySent || 0), 0), [accounts]);
  return { errorCount, queueCount, todayTotal };
}
