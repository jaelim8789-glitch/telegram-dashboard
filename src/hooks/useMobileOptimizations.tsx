"use client";

import { useState, useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { MobileSendSheet } from "@/components/ui/MobileSendSheet";

export function useMobileOptimizations() {
  const [showSendSheet, setShowSendSheet] = useState(false);
  const setActiveTab = useDashboardStore(s => s.setActiveTab);

  const openSendSheet = useCallback(() => setShowSendSheet(true), []);
  const closeSendSheet = useCallback(() => setShowSendSheet(false), []);

  const layoutClasses = "max-w-lg mx-auto px-4 space-y-3 pb-8";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return {
    isMobile,
    layoutClasses,
    showSendSheet,
    openSendSheet,
    closeSendSheet,
    MobileSendSheetComponent: (
      <MobileSendSheet open={showSendSheet} onClose={closeSendSheet} onSent={() => setActiveTab("dashboard")} />
    ),
  };
}
