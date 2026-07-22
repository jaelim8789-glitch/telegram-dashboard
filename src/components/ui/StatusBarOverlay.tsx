"use client";

import { useEffect, useState } from "react";
import { useStatusBar } from "@/hooks/useStatusBar";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Zap, Wifi, WifiOff } from "lucide-react";

function useTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function formatBattery(level: number | null): string {
  if (level === null) return "";
  return `${Math.round(level * 100)}%`;
}

export function StatusBarOverlay() {
  const { batteryLevel, isCharging } = useStatusBar();
  const { isOnline } = useNetworkStatus();
  const time = useTime();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)
    );
  }, []);

  if (!isStandalone) return null;

  return (
    <div
      className="status-bar-overlay fixed left-0 right-0 top-0 z-[9999] flex h-6 items-center justify-between px-4 text-[11px] font-medium"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(24px + env(safe-area-inset-top, 0px))" }}
    >
      <span className="flex items-center gap-1 opacity-70">
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 text-app-danger" />}
      </span>

      <span className="flex items-center gap-1 opacity-70">{time}</span>

      {batteryLevel !== null && (
        <span className="flex items-center gap-1 opacity-70">
          {isCharging && <Zap className="h-3 w-3 text-app-success" />}
          {formatBattery(batteryLevel)}
        </span>
      )}
    </div>
  );
}
