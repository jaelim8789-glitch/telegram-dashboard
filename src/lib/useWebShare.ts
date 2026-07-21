"use client";

import { useCallback } from "react";

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export function useWebShare() {
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const share = useCallback(async (data: ShareData) => {
    if (!canShare) {
      const url = data.url || window.location.href;
      try { await navigator.clipboard.writeText(url); } catch { }
      return false;
    }
    try {
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  }, [canShare]);

  return { share, canShare };
}
