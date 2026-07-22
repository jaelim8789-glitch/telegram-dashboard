"use client";

import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MobileAccountRegisterWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  function handleSubmit() {
    if (step === "phone" && phone.length >= 10) setStep("code");
    else if (step === "code" && code.length >= 4) { setStep("done"); setTimeout(() => { onComplete?.(); onClose(); setTimeout(() => setStep("phone"), 300); }, 2000); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-app-card p-5 pb-8 shadow-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-app-border" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-app-text">{step === "phone" ? "전화번호 입력" : step === "code" ? "인증번호" : "완료"}</h3>
              <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X className="h-5 w-5" /></button>
            </div>
            {step === "phone" && (
              <div className="space-y-3">
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="전화번호 (- 없이)" maxLength={11} autoFocus
                  className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text outline-none" inputMode="numeric" />
                <button onClick={handleSubmit} disabled={phone.length < 10} className="w-full rounded-xl bg-app-primary py-3 text-sm font-semibold text-white disabled:opacity-50 active:scale-[0.98]">인증번호 받기</button>
              </div>
            )}
            {step === "code" && (
              <div className="space-y-3">
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="인증번호 6자리" maxLength={6} autoFocus
                  className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text outline-none text-center text-lg tracking-widest" inputMode="numeric" />
                <button onClick={handleSubmit} disabled={code.length < 4} className="w-full rounded-xl bg-app-primary py-3 text-sm font-semibold text-white disabled:opacity-50 active:scale-[0.98]">확인</button>
              </div>
            )}
            {step === "done" && (
              <div className="flex flex-col items-center py-6"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 mb-3"><svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><p className="text-sm font-semibold text-app-text">계정 등록 완료!</p><p className="text-xs text-app-text-muted mt-1">곧 대시보드로 이동합니다</p></div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
