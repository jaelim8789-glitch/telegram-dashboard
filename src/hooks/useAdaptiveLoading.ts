"use client";

import { useEffect, useState } from "react";

interface AdaptiveLoading {
  connectionType: string;
  isMobile: boolean;
  isLowBandwidth: boolean;
  loadPriority: "critical" | "normal" | "deferred";
}

export function useAdaptiveLoading(): AdaptiveLoading {
  const [state, setState] = useState<AdaptiveLoading>(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return {
      connectionType: "unknown",
      isMobile,
      isLowBandwidth: false,
      loadPriority: isMobile ? "normal" : "critical",
    };
  });

  useEffect(() => {
    function update() {
      const conn = (navigator as unknown as { connection?: { effectiveType: string; downlink: number } }).connection;
      const connectionType = conn?.effectiveType ?? "unknown";
      const isMobile = window.innerWidth < 768;
      const isSlow = connectionType === "2g" || connectionType === "slow-2g";
      const isLowDownlink = conn ? conn.downlink < 0.5 : false;
      const isLowBandwidth = isSlow || isLowDownlink;

      let loadPriority: "critical" | "normal" | "deferred";
      if (isLowBandwidth) {
        loadPriority = "deferred";
      } else if (isMobile || connectionType === "3g") {
        loadPriority = "normal";
      } else {
        loadPriority = "critical";
      }

      setState({ connectionType, isMobile, isLowBandwidth, loadPriority });
    }

    update();

    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", update);

    const conn = (navigator as unknown as { connection?: { addEventListener: (e: string, h: () => void) => void } }).connection;
    conn?.addEventListener("change", update);

    return () => {
      mq.removeEventListener("change", update);
      conn?.removeEventListener("change", update);
    };
  }, []);

  return state;
}
