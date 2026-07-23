"use client";

import { useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useDataCache } from "@/store/useDataCache";

export function useShareDashboard() {
  const activeAccounts = useDashboardStore(s => s.accounts.filter(a => a.status === "active").length);
  const todayTotal = useDashboardStore(s => s.accounts.reduce((s, a) => s + (a.todaySent || 0), 0));

  const generateShareLink = useCallback(() => {
    const data = { accounts: activeAccounts, todaySent: todayTotal, ts: Date.now() };
    const encoded = btoa(JSON.stringify(data));
    return `${window.location.origin}/share?d=${encoded}`;
  }, [activeAccounts, todayTotal]);

  const generateShareImage = useCallback(async (element: HTMLElement): Promise<Blob> => {
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(element, { quality: 0.9, pixelRatio: 2, backgroundColor: "#17212b" });
    if (!blob) throw new Error("capture failed");
    return blob;
  }, []);

  return { generateShareLink, generateShareImage };
}
