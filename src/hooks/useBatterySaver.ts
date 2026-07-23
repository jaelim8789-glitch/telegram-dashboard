"use client";

import { useEffect } from "react";

/**
 * Battery/Data saver — 사용자 네트워크/배터리 상태에 따라 기능 조정
 */
export function useBatterySaver() {
  useEffect(() => {
    // Network type detection
    if ("connection" in navigator) {
      const conn = (navigator as any).connection;
      function onConnChange() {
        const slow = conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
        document.documentElement.setAttribute("data-slow-network", String(slow));
      }
      conn.addEventListener("change", onConnChange);
      onConnChange();
      return () => conn.removeEventListener("change", onConnChange);
    }
  }, []);

  useEffect(() => {
    // Battery detection
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        function onBatteryChange() {
          const low = battery.level < 0.2 && !battery.charging;
          document.documentElement.setAttribute("data-low-battery", String(low));
        }
        battery.addEventListener("levelchange", onBatteryChange);
        battery.addEventListener("chargingchange", onBatteryChange);
        onBatteryChange();
      }).catch(() => {});
    }
  }, []);
}
