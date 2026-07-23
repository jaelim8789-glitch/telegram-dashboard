"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function useQuickAction() {
  const setActiveTab = useDashboardStore(s => s.setActiveTab);

  const actions: Record<string, () => void> = {
    "connect-account": () => setActiveTab("register" as any),
    "quick-send": () => setActiveTab("send"),
    "ai-chat": () => setActiveTab("myai" as any),
    "view-logs": () => setActiveTab("log" as any),
  };

  const run = useCallback((actionId: string) => { actions[actionId]?.(); }, []);

  return { run };
}
