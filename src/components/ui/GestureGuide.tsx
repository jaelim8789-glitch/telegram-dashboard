"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Smartphone, RotateCw, ArrowLeft, ArrowRight } from "lucide-react";

const GESTURES = [
  { icon: ArrowLeft, label: "스와이프", desc: "화면 가장자리 → 뒤로가기" },
  { icon: RotateCw, label: "당겨서", desc: "아래로 → 새로고침" },
  { icon: ArrowRight, label: "탭 전환", desc: "가로 스와이프 → 탭 이동" },
];

export function GestureGuide({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("telemon-gesture-guide-seen");
    if (!seen) { setShow(true); localStorage.setItem("telemon-gesture-guide-seen", "1"); }
  }, []);

  if (!show) return null;

  const g = GESTURES[step];
  const Icon = g.icon;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { if (step < 2) setStep(s => s + 1); else { setShow(false); onDismiss(); } }}>
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
          <motion.div animate={{ x: [0, step === 0 ? -12 : step === 2 ? 12 : 0, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Icon className="h-10 w-10 text-white" />
          </motion.div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">{g.label}</h2>
          <p className="text-sm text-white/70">{g.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {GESTURES.map((_, i) => <div key={i} className={`h-1.5 w-6 rounded-full ${i === step ? "bg-white" : "bg-white/30"}`} />)}
        </div>
        <button onClick={() => { if (step < 2) setStep(s => s + 1); else { setShow(false); onDismiss(); } }} className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-black active:scale-95">
          {step < 2 ? "다음" : "시작하기"}
        </button>
      </div>
    </motion.div>
  );
}
