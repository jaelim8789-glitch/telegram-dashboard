"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, X } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkStatus() {
  const { isOnline, isSupported } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline) setDismissed(false);
  }, [isOnline]);

  if (!isSupported) return null;

  return (
    <AnimatePresence>
      {!isOnline && !dismissed && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative z-[60] flex items-center gap-3 bg-app-danger px-4 py-2 text-sm text-white"
          role="alert"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-xs font-medium">
            오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {isOnline && !dismissed && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative z-[60] flex items-center gap-3 bg-app-success px-4 py-2 text-sm text-white"
          role="status"
        >
          <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-xs font-medium">
            온라인 상태로 복구되었습니다.
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
