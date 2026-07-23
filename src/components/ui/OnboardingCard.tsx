"use client";

import { create } from "zustand";

interface OnboardingState { seen: boolean; currentStep: number; complete: () => void; next: () => void; prev: () => void; }

const STEPS = [
  { title: "환영합니다! 🎉", desc: "TeleMon 미니앱을 사용하면 Telegram 마케팅을 손쉽게 관리할 수 있습니다." },
  { title: "계정 연결", desc: "프로필 탭에서 첫 Telegram 계정을 연결하세요. 연결 후 바로 발송이 가능합니다." },
  { title: "AI 어시스턴트", desc: "AI 채팅탭에서 질문하면 DeepSeek AI가 답변합니다. '발송해줘'라고 말해보세요!" },
  { title: "발송하기", desc: "발송 탭에서 계정과 메시지를 선택하고 버튼 하나로 대량 발송을 시작하세요." },
];

export const useOnboarding = create<OnboardingState>((set, get) => ({
  seen: typeof window !== "undefined" ? !!localStorage.getItem("teleminiapp-onboarding-done") : false,
  currentStep: 0,
  complete: () => { set({ seen: true, currentStep: 0 }); try { localStorage.setItem("teleminiapp-onboarding-done", "1"); } catch {} },
  next: () => { const cur = get().currentStep; if (cur < STEPS.length - 1) set({ currentStep: cur + 1 }); else get().complete(); },
  prev: () => { const cur = get().currentStep; if (cur > 0) set({ currentStep: cur - 1 }); },
}));

export function OnboardingCard() {
  const { seen, currentStep, next, prev, complete } = useOnboarding();
  if (seen) return null;
  const step = STEPS[currentStep];
  return (
    <div className="rounded-2xl p-4 bg-gradient-to-br from-app-primary/20 to-transparent border border-app-primary/20">
      <div className="flex items-center gap-1 mb-2">{STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentStep ? "bg-app-primary" : "bg-app-border"}`} />)}</div>
      <p className="text-sm font-bold text-app-text mb-1">{step.title}</p>
      <p className="text-xs text-app-text-muted mb-3">{step.desc}</p>
      <div className="flex gap-2">
        {currentStep > 0 && <button onClick={prev} className="rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text-muted active:scale-95">이전</button>}
        <button onClick={next} className="rounded-lg bg-app-primary px-4 py-1.5 text-xs font-semibold text-white active:scale-95">{currentStep < STEPS.length - 1 ? "다음" : "시작하기"}</button>
        <button onClick={complete} className="text-[10px] text-app-text-muted ml-auto self-center hover:text-app-text">건너뛰기</button>
      </div>
    </div>
  );
}
