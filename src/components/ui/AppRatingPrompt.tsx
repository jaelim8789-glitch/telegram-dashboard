"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ExternalLink, X } from "lucide-react";

/**
 * App Rating Prompt — 3회 발송 성공 후 리뷰 유도
 */
export function AppRatingPrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const count = Number(localStorage.getItem("telemon-sends") || "0");
      const lastPrompt = Number(localStorage.getItem("telemon-rating-last") || "0");
      const daysSince = (Date.now() - lastPrompt) / 86400000;
      if (count >= 3 && daysSince > 30 && !dismissed) {
        setTimeout(() => setShow(true), 2000);
      }
    } catch {}
  }, [dismissed]);

  function rate() {
    window.open("https://apps.apple.com/app/idXXX", "_blank");
    try { localStorage.setItem("telemon-rating-last", String(Date.now())); } catch {}
    setShow(false);
  }

  function later() {
    try { localStorage.setItem("telemon-rating-last", String(Date.now())); } catch {}
    setShow(false);
  }

  function never() {
    setDismissed(true);
    setShow(false);
    try { localStorage.setItem("telemon-rating-dismissed", "true"); } catch {}
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="rounded-2xl border border-app-border bg-app-card p-4 shadow-2xl">
            <button onClick={never} className="absolute right-3 top-3 text-app-text-muted hover:text-app-text">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-app-warning fill-app-warning" />
              <span className="text-sm font-bold text-app-text">TeleMon이 도움이 되셨나요?</span>
            </div>
            <p className="text-xs text-app-text-muted mb-3">앱스토어 리뷰를 남겨주시면 더 나은 서비스가 됩니다</p>
            <div className="flex gap-2">
              <button onClick={rate} className="flex-1 rounded-xl bg-app-primary py-2 text-xs font-semibold text-white hover:opacity-90 flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5" /> 리뷰 남기기 <ExternalLink className="h-3 w-3" />
              </button>
              <button onClick={later} className="rounded-xl border border-app-border px-4 py-2 text-xs text-app-text-muted hover:bg-app-card-hover">다음에</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
