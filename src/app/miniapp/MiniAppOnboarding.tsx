"use client";

import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Bell, Check, ArrowRight } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";

interface Step {
  title: string;
  description: string;
  icon: typeof Send;
  color: string;
}

const STEPS: Step[] = [
  {
    title: "계정 연결",
    description: "텔레그램 계정을 연결하고\n발송할 준비를 하세요",
    icon: Users,
    color: "#3b82f6",
  },
  {
    title: "첫 발송",
    description: "메시지를 작성하고\n원하는 그룹에 발송해보세요",
    icon: Send,
    color: "#22c55e",
  },
  {
    title: "알림 설정",
    description: "발송 결과와 계정 상태\n알림을 받아보세요",
    icon: Bell,
    color: "#f59e0b",
  },
];

export const MiniAppOnboarding = memo(function MiniAppOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;

  const handleNext = useCallback(() => {
    try { hapticFeedback.impactOccurred("light"); } catch {}
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem("telemon-onboarding-done", "true");
      onComplete();
    }
  }, [step, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("telemon-onboarding-done", "true");
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "var(--tg-theme-bg-color, #17212b)" }}>
      <button onClick={handleSkip} className="self-end px-4 py-3 text-xs font-medium active:scale-90" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
        건너뛰기
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6" style={{ backgroundColor: `${current.color}20` }}>
              <Icon className="h-12 w-12" style={{ color: current.color }} />
            </div>
            <h2 className="text-xl font-bold mb-3 text-center" style={{ color: "var(--tg-theme-text-color)" }}>{current.title}</h2>
            <p className="text-sm text-center leading-relaxed whitespace-pre-line" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full transition-all"
            style={{
              width: i === step ? 24 : 6,
              backgroundColor: i <= step ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-hint-color, #708499)",
            }} />
        ))}
      </div>

      <div className="px-6 pb-8">
        <button onClick={handleNext}
          className="w-full rounded-xl py-4 text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
          {step < STEPS.length - 1 ? (
            <>다음 <ArrowRight className="h-4 w-4" /></>
          ) : (
            <><Check className="h-4 w-4" /> 시작하기</>
          )}
        </button>
      </div>
    </div>
  );
});
