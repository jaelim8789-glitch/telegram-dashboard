"use client";

import { useState, useEffect, useCallback } from "react";

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType: string;
    saveData: boolean;
    addEventListener: (type: "change", listener: () => void) => void;
    removeEventListener: (type: "change", listener: () => void) => void;
  };
};

type NavigatorWithBattery = Navigator & {
  getBattery: () => Promise<{
    level: number;
    charging: boolean;
    addEventListener: (type: "levelchange" | "chargingchange", listener: () => void) => void;
    removeEventListener: (type: "levelchange" | "chargingchange", listener: () => void) => void;
  }>;
};

type PerformanceMode = "full" | "reduced" | "minimal";

interface UsePerformanceModeResult {
  mode: PerformanceMode;
  isSlowNetwork: boolean;
  isLowBattery: boolean;
  isDataSaver: boolean;
}

export function usePerformanceMode(): UsePerformanceModeResult {
  const [isSlowNetwork, setSlowNetwork] = useState(false);
  const [isLowBattery, setLowBattery] = useState(false);
  const [isDataSaver, setDataSaver] = useState(false);

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection;
    if (!nav.connection) return;

    const checkNetwork = () => {
      if (!nav.connection) return;
      const slow =
        nav.connection.effectiveType === "slow-2g" ||
        nav.connection.effectiveType === "2g";
      setSlowNetwork(slow);
      setDataSaver(!!nav.connection.saveData);
      document.documentElement.setAttribute("data-slow-network", String(slow));
      document.documentElement.setAttribute("data-save-data", String(!!nav.connection.saveData));
    };

    checkNetwork();
    nav.connection.addEventListener("change", checkNetwork);
    return () => nav.connection!.removeEventListener("change", checkNetwork);
  }, []);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;

    nav.getBattery().then((battery) => {
      const checkBattery = () => {
        const low = battery.level < 0.2 && !battery.charging;
        setLowBattery(low);
        document.documentElement.setAttribute("data-low-battery", String(low));
      };
      checkBattery();
      battery.addEventListener("levelchange", checkBattery);
      battery.addEventListener("chargingchange", checkBattery);
    }).catch(() => {});
  }, []);

  const mode: PerformanceMode = isLowBattery
    ? "minimal"
    : isSlowNetwork || isDataSaver
      ? "reduced"
      : "full";

  return { mode, isSlowNetwork, isLowBattery, isDataSaver };
}
