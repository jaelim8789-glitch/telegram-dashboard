"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";

interface GoldSplashProps {
  show: boolean;
  onDone?: () => void;
}

/**
 * Gold Splash — 로그인 후 3초 로고 글로우 애니메이션
 */
export function GoldSplash({ show, onDone }: GoldSplashProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(t);
  }, [show, onDone]);

  useEffect(() => {
    if (show) {
      try { audioRef.current?.play(); } catch {}
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#090909]"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-24 w-24 items-center justify-center rounded-3xl"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #a08030)",
                boxShadow: "0 0 60px rgba(212,175,55,0.3), 0 0 120px rgba(212,175,55,0.15)",
              }}
            >
              <Sparkles className="h-10 w-10 text-white" />
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-lg font-serif font-bold tracking-wide"
            style={{ color: "#D4AF37" }}
          >
            TeleMon
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-1 text-xs text-[#786e60]"
          >
            AI 운영 플랫폼
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-8"
          >
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#D4AF37" }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
