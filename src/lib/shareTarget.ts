"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

/**
 * Share Target Handler — 외부 앱에서 "공유" → TeleMon 발송탭에 자동 입력
 * manifest.json의 share_target.action → /app?share-target=true
 */
export function useShareTarget() {
  const setSendMessage = useDashboardStore((s) => s.setSendMessage);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("share-target")) return;

    const title = params.get("title") || "";
    const text = params.get("text") || "";
    const url = params.get("url") || "";

    const combined = [title, text, url].filter(Boolean).join("\n\n");
    if (combined) {
      setSendMessage(combined);
      setActiveTab("send");
    }

    // Clean URL
    const clean = new URL(window.location.href);
    clean.searchParams.delete("share-target");
    clean.searchParams.delete("title");
    clean.searchParams.delete("text");
    clean.searchParams.delete("url");
    window.history.replaceState({}, "", clean.toString());
  }, []);
}
