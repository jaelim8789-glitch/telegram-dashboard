"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Static demo messages ──
const MESSAGES: { from: "user" | "bot"; text: string; delay: number }[] = [
  { from: "user", text: "가격이 어떻게 되나요?", delay: 1000 },
  { from: "bot", text: "안녕하세요! 🙏\nPro 요금제: $100/월 (10개 계정)\nTeam 요금제: $199/분기 (20개 계정)\n자세한 내용은 요금제 페이지를 확인해주세요!", delay: 2000 },
  { from: "user", text: "감사합니다! 바로 가입할게요 😊", delay: 3000 },
  { from: "bot", text: "감사합니다! 🎉\n아래 '시작하기' 버튼을 눌러 바로 시작하세요!", delay: 4000 },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/60" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/60" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/60" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

export default function ChatDemo() {
  const [visibleMessages, setVisibleMessages] = useState<typeof MESSAGES>([]);
  const [typing, setTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    MESSAGES.forEach((msg, i) => {
      timers.push(
        setTimeout(() => {
          if (msg.from === "bot") {
            setTyping(true);
            setTimeout(() => {
              setTyping(false);
              setVisibleMessages((prev) => [...prev, msg]);
            }, 800);
          } else {
            setVisibleMessages((prev) => [...prev, msg]);
          }
        }, msg.delay)
      );
    });

    // Auto-scroll to bottom
    const scrollInterval = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(scrollInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-app-border px-4 py-3 bg-gradient-to-r from-app-primary-muted to-accent-glow/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-[10px] font-bold text-[var(--color-accent-contrast)] shadow-sm">
            TM
          </div>
          <div>
            <p className="text-xs font-semibold text-app-text">TeleMon</p>
            <p className="text-[10px] text-app-text-muted">Online</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={containerRef} className="flex flex-col gap-2 px-4 py-3 min-h-[260px] max-h-[320px] overflow-y-auto">
          <AnimatePresence>
            {visibleMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.from === "user"
                      ? "rounded-tr-md bg-accent/20 text-app-text"
                      : "rounded-tl-md bg-app-card-hover text-app-text-secondary"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl rounded-tl-md bg-app-card-hover px-3.5 py-2.5">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-app-border px-4 py-2.5 bg-app-surface/50">
          <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2">
            <input
              type="text"
              placeholder="메시지를 입력하세요..."
              disabled
              className="flex-1 bg-transparent text-xs text-app-text placeholder:text-app-text-subtle outline-none"
            />
            <button
              type="button"
              disabled
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-primary-muted text-app-primary"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}