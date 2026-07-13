"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "./useOnboarding";

/* ──────────────────────────────────────────────
 * Lightweight onboarding tour for new TeleMon users.
 *
 * Shows a 3-step modal overlay once, only for first-time visitors.
 * Steps: Accounts → Workspace → Inspector
 * ────────────────────────────────────────────── */

interface Step {
  title: string;
  description: string;
  icon: string;
}

const STEPS: Step[] = [
  {
    title: "계정 관리",
    description:
      "Telegram 계정을 등록하고 상태를 모니터링하세요. 각 계정의 연결 상태, 세션 만료, 활동 내역을 한눈에 확인할 수 있습니다.",
    icon: "👤",
  },
  {
    title: "워크스페이스",
    description:
      "메시지 발송, 자동 응답 설정, 그룹 검색 등 주요 작업을 워크스페이스에서 수행합니다. 탭을 클릭해 원하는 기능으로 빠르게 전환하세요.",
    icon: "⚡",
  },
  {
    title: "인스펙터",
    description:
      "전송된 메시지의 전달 상태, 로그, 분석 데이터를 인스펙터에서 확인하세요. 실시간 모니터링으로 항상 최신 정보를 유지합니다.",
    icon: "🔍",
  },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`block h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-[var(--color-accent)]"
              : i < current
              ? "w-1.5 bg-[var(--color-accent)]"
              : "w-1.5 bg-[var(--color-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function OnboardingTour() {
  const { show, dismiss } = useOnboarding();
  const [step, setStep] = useState(0);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const goPrev = useCallback(() => {
    setStep((s) => s - 1);
  }, []);

  const handleSkip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!show) return null;

  const s = STEPS[step];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="onboarding-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={handleSkip}
        >
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close / skip button */}
            <button
              type="button"
              onClick={handleSkip}
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-light)] transition-all text-xs"
              aria-label="둘러보기 건너뛰기"
            >
              ✕
            </button>

            {/* Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-light)] text-2xl">
              {s.icon}
            </div>

            {/* Step indicator */}
            <StepIndicator current={step} total={STEPS.length} />

            {/* Title */}
            <h2 className="mt-3 text-lg font-bold text-[var(--color-text)]">
              {s.title}
            </h2>

            {/* Description */}
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {s.description}
            </p>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                건너뛰기
              </button>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="btn-heritage-secondary !px-3 !py-1.5 !text-xs"
                  >
                    이전
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="btn-heritage !px-4 !py-1.5 !text-xs"
                >
                  {step < STEPS.length - 1 ? "다음" : "시작하기"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}