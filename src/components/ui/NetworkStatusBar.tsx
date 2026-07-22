"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

const COLORS = {
  healthy: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
};

export function NetworkStatusBar({ online, latency }: { online: boolean; latency: number }) {
  const color = !online ? "offline" : latency > 1000 ? "degraded" : "healthy";

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: online ? 3 : 20, opacity: 1 }}
      className={COLORS[color] + " flex items-center justify-center overflow-hidden"}
    >
      {!online && (
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-white">
          <WifiOff className="h-3 w-3" /> 오프라인 상태입니다
        </span>
      )}
    </motion.div>
  );
}
