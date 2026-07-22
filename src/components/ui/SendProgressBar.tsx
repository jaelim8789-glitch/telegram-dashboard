"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

interface SendProgressBarProps {
  inFlightCount: number;
  onTap?: () => void;
}

export function SendProgressBar({ inFlightCount, onTap }: SendProgressBarProps) {
  return (
    <AnimatePresence>
      {inFlightCount > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={onTap}
          className="fixed bottom-4 left-4 right-4 z-40 flex items-center gap-3 rounded-xl bg-app-primary px-4 py-3 shadow-lg shadow-app-primary/30 md:left-auto md:right-4 md:w-72"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 12px)" }}
        >
          <div className="relative h-5 w-5">
            <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
            <Send className="relative h-5 w-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-white">{inFlightCount}개 발송 진행 중</div>
            <div className="h-1 mt-1 w-full overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-white"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
