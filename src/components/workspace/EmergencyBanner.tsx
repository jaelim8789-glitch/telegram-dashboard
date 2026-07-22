"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmergencyBannerProps {
  errorCount: number;
  totalCount: number;
  onViewAccounts?: () => void;
  onViewLogs?: () => void;
  onDismiss?: () => void;
}

export function EmergencyBanner({
  errorCount,
  totalCount,
  onViewAccounts,
  onViewLogs,
  onDismiss,
}: EmergencyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

  if (dismissed || errorRate <= 20) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-red-600 p-4 shadow-lg shadow-rose-500/20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">긴급 상황 감지</h3>
            <p className="text-xs text-white/80 mt-0.5">
              오류율이 {Math.round(errorRate)}%에 도달했습니다 ({errorCount}/{totalCount})
            </p>
            <div className="flex gap-2 mt-3">
              {onViewAccounts && (
                <button
                  type="button"
                  onClick={onViewAccounts}
                  className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  계정 확인
                </button>
              )}
              {onViewLogs && (
                <button
                  type="button"
                  onClick={onViewLogs}
                  className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  로그 보기
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setDismissed(true); onDismiss?.(); }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
