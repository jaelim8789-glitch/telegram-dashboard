"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

export function AppUpdateChecker() {
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(reg => {
        reg.addEventListener("updatefound", () => setUpdate(true));
      }).catch(() => {});
    }
  }, []);

  if (!update) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-app-primary px-4 py-2 shadow-xl">
      <RefreshCw className="h-4 w-4 text-white animate-spin" />
      <span className="text-xs font-medium text-white">업데이트가 있습니다</span>
      <button onClick={() => window.location.reload()} className="text-xs font-bold text-white underline">적용</button>
    </div>
  );
}
