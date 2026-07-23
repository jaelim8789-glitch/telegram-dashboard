"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

const STEPS: TourStep[] = [
  {
    target: "[data-tour='nav-dashboard']",
    title: "대시보드",
    description: "운영 현황을 한눈에 확인하세요. 발송 상태, 계정 건강, 실시간 메트릭을 모니터링합니다.",
    position: "bottom",
  },
  {
    target: "[data-tour='nav-send']",
    title: "발송",
    description: "메시지를 작성하고 그룹/채널에 발송합니다. 예약 발송과 반복 스케줄도 설정할 수 있습니다.",
    position: "bottom",
  },
  {
    target: "[data-tour='nav-log']",
    title: "로그",
    description: "발송 이력을 확인하고 실패한 건은 재발송할 수 있습니다.",
    position: "top",
  },
  {
    target: "[data-tour='nav-group']",
    title: "그룹 관리",
    description: "텔레그램 그룹/채널을 관리하고 새 대상을 검색하세요.",
    position: "top",
  },
  {
    target: "[data-tour='nav-scheduler']",
    title: "스케줄러",
    description: "반복 발송을 설정하여 정기적인 메시지를 자동화하세요.",
    position: "top",
  },
];

const TOUR_KEY = "telemon-onboarding-done";

export function OnboardingTour() {
  const [step, setStep] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const timer = setTimeout(() => setStep(0), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (step < 0 || step >= STEPS.length) return;
    const el = document.querySelector(STEPS[step].target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [step]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  const current = STEPS[step];
  if (!current || !targetRect) return null;

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setStep(-1);
  };

  const pos = current.position ?? "bottom";
  const gap = 12;
  let tooltipX: number;
  let tooltipY: number;
  let arrowClass: string;

  switch (pos) {
    case "top":
      tooltipX = targetRect.left + targetRect.width / 2;
      tooltipY = targetRect.top - gap;
      arrowClass = "bottom-full left-1/2 -translate-x-1/2 border-b-app-card";
      break;
    case "left":
      tooltipX = targetRect.left - gap;
      tooltipY = targetRect.top + targetRect.height / 2;
      arrowClass = "right-full top-1/2 -translate-y-1/2 border-r-app-card";
      break;
    case "right":
      tooltipX = targetRect.right + gap;
      tooltipY = targetRect.top + targetRect.height / 2;
      arrowClass = "left-full top-1/2 -translate-y-1/2 border-l-app-card";
      break;
    default:
      tooltipX = targetRect.left + targetRect.width / 2;
      tooltipY = targetRect.bottom + gap;
      arrowClass = "top-full left-1/2 -translate-x-1/2 border-t-app-card";
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/30" onClick={dismiss} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-[101] w-72"
        style={{ left: tooltipX - 144, top: tooltipY }}
      >
        <div className="relative rounded-xl border border-app-border bg-app-card p-4 shadow-2xl">
          <div className={cn("absolute w-3 h-3 rotate-45 bg-app-card border-app-border", arrowClass)} />
          <button onClick={dismiss} className="absolute right-2 top-2 rounded-lg p-1 text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pr-4 text-xs font-semibold text-app-text">{current.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-app-text-muted">{current.description}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={`tour-dot-${i}`} className={cn("h-1.5 w-1.5 rounded-full transition-colors", i === step ? "bg-app-primary" : "bg-app-border")} />
              ))}
            </div>
            <div className="flex gap-1.5">
              {step < STEPS.length - 1 ? (
                <>
                  <button onClick={dismiss} className="rounded-lg px-2 py-1 text-[10px] text-app-text-muted hover:text-app-text transition-colors">건너뛰기</button>
                  <button onClick={() => setStep(step + 1)} className="rounded-lg bg-app-primary px-3 py-1 text-[10px] font-medium text-white hover:bg-app-primary-hover transition-colors">다음</button>
                </>
              ) : (
                <button onClick={dismiss} className="rounded-lg bg-app-primary px-3 py-1 text-[10px] font-medium text-white hover:bg-app-primary-hover transition-colors">시작하기</button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
