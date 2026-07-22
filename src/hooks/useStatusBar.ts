"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/useTheme";

export function useStatusBar() {
  const { resolvedTheme } = useTheme();
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const updateNativeStatusBar = useCallback(async (theme: string) => {
    if (typeof window === "undefined") return;
    const hasCapacitor = typeof (window as any).Capacitor !== "undefined";
    if (!hasCapacitor) return;
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      const isDark = theme === "dark";
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      await StatusBar.setBackgroundColor({ color: isDark ? "#0a0a0a" : "#f5f0e8" });
    } catch {}
  }, []);

  useEffect(() => {
    updateNativeStatusBar(resolvedTheme);
  }, [resolvedTheme, updateNativeStatusBar]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        function update() {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);
        }
        update();
        battery.addEventListener("levelchange", update);
        battery.addEventListener("chargingchange", update);
        return () => {
          battery.removeEventListener("levelchange", update);
          battery.removeEventListener("chargingchange", update);
        };
      }).catch((e) => console.warn("useStatusBar: navigator.getBattery 실패", e));
    }

    if (typeof CSS !== "undefined" && CSS.supports("top", "env(safe-area-inset-top)")) {
      const check = () => {
        const value = getComputedStyle(document.documentElement)
          .getPropertyValue("--sat")
          .trim();
        if (value) {
          setStatusBarHeight(parseInt(value, 10) || 0);
        } else {
          setStatusBarHeight(24);
        }
      };
      check();
    } else {
      setStatusBarHeight(0);
    }
  }, []);

  return { batteryLevel, isCharging, statusBarHeight };
}
