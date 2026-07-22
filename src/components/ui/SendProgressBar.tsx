"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface SendProgressBarProps {
  inFlightCount: number;
  recentFailures?: number;
  recentSuccesses?: number;
  onTap?: () => void;
}

export function SendProgressBar({ inFlightCount, recentFailures = 0, recentSuccesses = 0, onTap }: SendProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const total = inFlightCount + recentFailures + recentSuccesses;
  const percent = total > 0 ? Math.round((recentSuccesses + recentFailures) / total * 100) : 0;

  useEffect(() => {
    if (percent > progress) {
      const timer = setTimeout(() => setProgress(percent), 100);
      return () => clearTimeout(timer);
    }
    if (percent === 0 && progress > 0) {
      const timer = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timer);
    }
  }, [percent, progress]);

  const showPercent = inFlightCount > 0 && percent > 0;

  return (
    <AnimatePresence>
      {inFlightCount > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={onTap}
          className="fixed bottom-4 left-4 right-4 z-40 flex flex-col gap-2 rounded-xl bg-app-primary px-4 py-3 shadow-lg shadow-app-primary/30 md:left-auto md:right-4 md:w-80"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 12px)" }}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-5 w-5">
              <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
              <Send className="relative h-5 w-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white">
                {inFlightCount}개 발송 진행 중
                {showPercent && (
                  <span className="ml-1.5 text-xs text-white/70 tabular-nums">
                    {percent}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {recentSuccesses > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-white/80">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="tabular-nums">{recentSuccesses}</span>
                </span>
              )}
              {recentFailures > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-white/80">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="tabular-nums">{recentFailures}</span>
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: `${progress}%` }}
              animate={{ width: `${showPercent ? progress : 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {!showPercent && inFlightCount > 0 && (
              <motion.div
                className="absolute top-0 h-full w-1/3 rounded-full bg-white/30"
                animate={{ x: ["-100%", "400%"] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
              />
            )}
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
