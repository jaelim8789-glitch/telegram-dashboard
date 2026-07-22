"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Step { title: string; description: string; action?: { label: string; onClick: () => void }; }

export function OnboardingFlow({ steps, onComplete, show }: { steps: Step[]; onComplete: () => void; show: boolean }) {
  const [step, setStep] = useState(0);

  if (!show) return null;

  const s = steps[step];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <motion.div key={step} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="mx-4 w-full max-w-sm rounded-2xl bg-app-card p-6 shadow-2xl">
          <div className="flex items-center gap-1.5 mb-4">
            {steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-app-primary" : "bg-app-border"}`} />)}
          </div>
          <h2 className="text-lg font-bold text-app-text mb-2">{s.title}</h2>
          <p className="text-sm text-app-text-muted mb-6">{s.description}</p>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium border border-app-border text-app-text-muted active:scale-95">
                <ChevronLeft className="h-4 w-4" /> 이전
              </button>
            )}
            {s.action ? (
              <button onClick={() => { s.action!.onClick(); }} className="flex-1 rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white active:scale-[0.98]">{s.action.label}</button>
            ) : (
              <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onComplete()} className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white active:scale-[0.98]">
                {step < steps.length - 1 ? <>다음 <ChevronRight className="h-4 w-4" /></> : "시작하기"}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
