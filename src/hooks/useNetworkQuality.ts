"use client";

import { useState, useEffect } from "react";

export type NetworkQuality = "good" | "fair" | "poor";

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>("good");

  useEffect(() => {
    function check() {
      if ("connection" in navigator) {
        const conn = (navigator as any).connection;
        const type = conn.effectiveType || "4g";
        setQuality(type === "4g" ? "good" : type === "3g" ? "fair" : "poor");
      }
    }
    check();
    if ("connection" in navigator) {
      const conn = (navigator as any).connection;
      conn.addEventListener("change", check);
      return () => conn.removeEventListener("change", check);
    }
  }, []);

  return quality;
}
