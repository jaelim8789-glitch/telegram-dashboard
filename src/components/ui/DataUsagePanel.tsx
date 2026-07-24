"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { useDataCache } from "@/store/useDataCache";

export function DataUsagePanel() {
  const cache = useDataCache(s => s.cache);
  const [usage, setUsage] = useState({ apiCalls: 0, dataTransferred: "0 MB" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("telemon-api-usage");
      if (raw) setUsage(JSON.parse(raw));
    } catch (e) { console.warn('Unhandled error in DataUsagePanel', e) }
    const entries = performance.getEntriesByType("resource");
    const totalSize = entries.reduce((s, e: any) => s + (e.transferSize || 0), 0);
    setUsage(prev => ({ ...prev, dataTransferred: `${(totalSize / 1024 / 1024).toFixed(1)} MB` }));
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-app-text flex items-center gap-1.5">?�� ?�이???�용??/p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-app-card-hover p-3"><p className="text-[10px] text-app-text-muted">API ?�출</p><p className="text-sm font-bold text-app-text">{usage.apiCalls.toLocaleString()}??/p></div>
        <div className="rounded-xl bg-app-card-hover p-3"><p className="text-[10px] text-app-text-muted">?�송??/p><p className="text-sm font-bold text-app-text">{usage.dataTransferred}</p></div>
      </div>
    </div>
  );
}
