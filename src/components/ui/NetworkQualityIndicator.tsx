"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkQualityIndicator() {
  const [quality, setQuality] = useState<"good" | "fair" | "poor">("good");

  useEffect(() => {
    function check() {
      if ("connection" in navigator) {
        const conn = (navigator as any).connection;
        const type = conn.effectiveType;
        setQuality(type === "4g" ? "good" : type === "3g" ? "fair" : "poor");
      }
    }
    check();
    if ("connection" in navigator) {
      (navigator as any).connection.addEventListener("change", check);
      return () => (navigator as any).connection.removeEventListener("change", check);
    }
  }, []);

  const colors = { good: "bg-app-success", fair: "bg-app-warning", poor: "bg-app-danger" };

  return (
    <div className="flex items-center gap-1" title={`네트워크: ${quality === "good" ? "양호" : quality === "fair" ? "보통" : "나쁨"}`}>
      {quality === "poor" ? <WifiOff className="h-3 w-3 text-app-danger" /> : <Wifi className={`h-3 w-3 ${colors[quality]}`} />}
      <span className={`h-1.5 w-1.5 rounded-full ${colors[quality]}`} />
    </div>
  );
}
