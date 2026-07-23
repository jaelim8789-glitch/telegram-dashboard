"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, X } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const OFFLINE_RESTRICTIONS = [
  "메시지 발송",
  "계정 등록",
  "그룹 목록 갱신",
  "AI 기능 사용",
];

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
          className="relative z-[60] bg-app-danger"
          role="alert"
        >
          <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3 text-sm text-white">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">오프라인 상태입니다</p>
              <ul className="mt-1 space-y-0.5">
                {OFFLINE_RESTRICTIONS.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    {item} 불가
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="shrink-0 rounded-md p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
