"use client";

import { create } from "zustand";

interface OnboardingState { seen: boolean; currentStep: number; complete: () => void; next: () => void; prev: () => void; }

const STEPS = [
  { title: "?�영?�니?? ?��", desc: "TeleMon 미니?�을 ?�용?�면 Telegram 마�??�을 ?�쉽�?관리할 ???�습?�다." },
  { title: "계정 ?�결", desc: "?�로????��??�?Telegram 계정???�결?�세?? ?�결 ??바로 발송??가?�합?�다." },
  { title: "AI ?�시?�턴??, desc: "AI 채팅??��??질문?�면 DeepSeek AI가 ?��??�니?? '발송?�줘'?�고 말해보세??" },
  { title: "발송?�기", desc: "발송 ??��??계정�?메시지�??�택?�고 버튼 ?�나�??�??발송???�작?�세??" },
];

export const useOnboarding = create<OnboardingState>((set, get) => ({
  seen: typeof window !== "undefined" ? !!localStorage.getItem("teleminiapp-onboarding-done") : false,
  currentStep: 0,
  complete: () => { set({ seen: true, currentStep: 0 }); try { localStorage.setItem("teleminiapp-onboarding-done", "1"); } catch (e) { console.warn('Unhandled error in OnboardingCard', e) } },
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
        {currentStep > 0 && <button onClick={prev} className="rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text-muted active:scale-95">?�전</button>}
        <button onClick={next} className="rounded-lg bg-app-primary px-4 py-1.5 text-xs font-semibold text-white active:scale-95">{currentStep < STEPS.length - 1 ? "?�음" : "?�작?�기"}</button>
        <button onClick={complete} className="text-[10px] text-app-text-muted ml-auto self-center hover:text-app-text">건너?�기</button>
      </div>
    </div>
  );
}
