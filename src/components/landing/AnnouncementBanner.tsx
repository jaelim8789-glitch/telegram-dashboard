"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";

const ANNOUNCEMENTS = [
  {
    text: "✨ TeleMon 2.0 — 새로운 UI/UX, 전달 분석, 답장매크로 기능 추가!",
    href: "/changelog",
  },
  {
    text: "💎 첫 발자취 요금제 — 시작부터 함께한 당신, 평생을 함께합니다.",
    href: "/pricing",
  },
  {
    text: "🛡️ 계정 건강 모니터링 — 세션 만료, 차단, 오류를 실시간 감지합니다.",
    href: "/features",
  },
];

export function AnnouncementBanner() {
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  if (dismissed) return null;

  const announcement = ANNOUNCEMENTS[current];

  return (
    <div className="relative z-40 flex items-center justify-center gap-3 border-b border-accent-border/20 bg-gradient-to-r from-accent-glow/10 via-app-card to-accent-glow/10 px-4 py-2.5 text-xs">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-app-primary" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href={announcement.href}
            className="text-app-text-secondary hover:text-app-primary transition-colors"
          >
            {announcement.text}
          </Link>
        </motion.div>
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-app-text-muted hover:text-app-primary hover:bg-app-primary-muted transition-colors"
        aria-label="닫기"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}