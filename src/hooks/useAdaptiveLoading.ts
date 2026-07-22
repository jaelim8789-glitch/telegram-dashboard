"use client";

import { useState, useEffect } from "react";

export type ConnectionType = "slow-2g" | "2g" | "3g" | "4g" | "5g" | "wifi";
export type LoadPriority = "critical" | "normal" | "deferred";

export interface AdaptiveLoadingState {
  connectionType: ConnectionType | null;
  isMobile: boolean;
  isLowBandwidth: boolean;
  loadPriority: LoadPriority;
}

function getConnectionType(): ConnectionType | null {
  if (typeof navigator === "undefined" || !("connection" in navigator)) return null;
  const conn = (navigator as any).connection;
  const effectiveType = conn.effectiveType as string | undefined;
  if (!effectiveType) return null;
  if (effectiveType === "slow-2g" || effectiveType === "2g") return effectiveType as ConnectionType;
  if (effectiveType === "3g") return "3g";
  if (effectiveType === "4g") return "4g";
  return null;
}

function computePriority(isMobile: boolean, connectionType: ConnectionType | null): LoadPriority {
  if (!connectionType) return "critical";
  if (connectionType === "slow-2g" || connectionType === "2g") return "deferred";
  if (isMobile && connectionType === "3g") return "deferred";
  if (connectionType === "3g") return "normal";
  if (isMobile && connectionType === "4g") return "normal";
  return "critical";
}

export function useAdaptiveLoading(): AdaptiveLoadingState {
  const [isMobile, setIsMobile] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType | null>(null);

  useEffect(() => {
    function checkWidth() { setIsMobile(window.innerWidth < 768); }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    function check() { setConnectionType(getConnectionType()); }
    check();
    if ("connection" in navigator) {
      const conn = (navigator as any).connection;
      conn.addEventListener("change", check);
      return () => conn.removeEventListener("change", check);
    }
  }, []);

  const loadPriority = computePriority(isMobile, connectionType);
  const isLowBandwidth = loadPriority === "deferred";

  return { connectionType, isMobile, isLowBandwidth, loadPriority };
}
