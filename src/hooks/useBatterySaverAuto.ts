"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getBattery } from "@/lib/battery";

interface BatteryInfo { level: number; charging: boolean; }

export function useBatterySaverAuto() {
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [connectionType, setConnectionType] = useState<string>("unknown");
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    getBattery().then(b => {
      setBattery({ level: b.level, charging: b.charging });
      setIsLowPower(b.level < 0.2 && !b.charging);
      b.onlevelchange = () => { setBattery(prev => ({ level: b.level, charging: prev?.charging || false })); setIsLowPower(b.level < 0.2 && !b.charging); };
    }).catch(() => {});
    if ("connection" in navigator) {
      const c = (navigator as any).connection;
      const update = () => setConnectionType(c.effectiveType || "unknown");
      update(); c.addEventListener("change", update);
    }
  }, []);

  const isSaverMode = isLowPower || connectionType === "slow-2g" || connectionType === "2g";
  return { battery, connectionType, isLowPower, isSaverMode };
}
