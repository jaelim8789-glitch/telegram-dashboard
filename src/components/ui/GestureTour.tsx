"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

const STEPS = [
  { icon: "👉", title: "스와이프로 탭 이동", desc: "좌우로 스와이프하여 탭을 전환할 수 있습니다." },
  { icon: "↔️", title: "가장자리 스와이프", desc: "화면 가장자리에서 스와이프하여 사이드바를 열 수 있습니다." },
  { icon: "⬆️", title: "당겨서 새로고침", desc: "화면을 아래로 당겨 데이터를 새로고침하세요." },
  { icon: "👇", title: "바텀시트 닫기", desc: "바텀시트를 아래로 드래그하여 닫을 수 있습니다." },
];

const STORAGE_KEY = "telemon-gesture-tour-done";

export function GestureTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative max-w-sm w-full rounded-2xl border border-[var(--color-accent-border)] bg-app-card p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={finish}
              className="absolute top-3 right-3 rounded-full p-1 text-app-text-muted hover:text-app-text"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center space-y-4">
              <div className="text-4xl">{STEPS[step].icon}</div>
              <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {STEPS[step].title}
              </h3>
              <p className="text-sm text-app-text-muted">{STEPS[step].desc}</p>

              {/* Step dots */}
              <div className="flex justify-center gap-2">
                {STEPS.map((_, i) => (
                  <div
                    key={`gesture-dot-${i}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-app-primary" : "w-1.5 bg-app-border"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="btn-luxury btn-luxury-secondary flex-1 justify-center text-xs"
                  >
                    <ArrowLeft className="h-3 w-3" /> 이전
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="btn-luxury btn-luxury-primary flex-1 justify-center text-xs"
                  >
                    다음 <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finish}
                    className="btn-luxury btn-luxury-primary flex-1 justify-center text-xs"
                  >
                    시작하기
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
