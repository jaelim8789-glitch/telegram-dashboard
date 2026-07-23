"use client";

import { useEffect, useState } from "react";

interface StatusBarInfo {
  batteryLevel: number | null;
  isCharging: boolean;
  statusBarHeight: number;
}

export function useStatusBar(): StatusBarInfo {
  const [info, setInfo] = useState<StatusBarInfo>({
    batteryLevel: null,
    isCharging: false,
    statusBarHeight: 0,
  });

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight;
      const sh = window.screen?.height ?? vh;
      setInfo((prev) => ({ ...prev, statusBarHeight: Math.max(0, sh - vh - 44) }));
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    const batteryManager = (navigator as { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery;
    if (batteryManager) {
      batteryManager.call(navigator).then((battery) => {
        setInfo((prev) => ({
          ...prev,
          batteryLevel: battery.level,
          isCharging: battery.charging,
        }));
      }).catch(() => {});
    }

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  return info;
}
