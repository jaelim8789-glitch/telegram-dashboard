"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, Loader2, Users, Paperclip, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

let hapticFeedback: any = null;
if (typeof window !== "undefined") {
  import("@tma.js/sdk-react").then(m => { hapticFeedback = m.hapticFeedback; }).catch(() => {});
}

type Step = "account" | "message" | "confirm";

const STEPS: { label: string; icon: typeof Send }[] = [
  { label: "계정", icon: Users },
  { label: "메시지", icon: Send },
  { label: "확인", icon: CheckCircle2 },
];

const TEMPLATE_CHIPS = ["프로모션", "공지사항", "이벤트"];

export function MobileSendSheet({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent?: () => void }) {
  const [step, setStep] = useState<Step>("account");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepIndex = ["account", "message", "confirm"].indexOf(step);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try { hapticFeedback?.impactOccurred("medium"); } catch {}
    await new Promise(r => setTimeout(r, 1000));
    setSent(true); setSending(false);
    try { hapticFeedback?.notificationOccurred("success"); } catch {}
    setTimeout(() => { onSent?.(); onClose(); setSent(false); setStep("account"); setMessage(""); setScheduled(false); setScheduledTime(""); setImageFile(null); }, 1500);
  }, [message, sending, onClose, onSent]);

  function handleClose() {
    if (sending) return;
    onClose();
    setTimeout(() => {
      setStep("account"); setMessage(""); setSelectedAccount(""); setScheduled(false); setScheduledTime(""); setImageFile(null); setSent(false);
    }, 200);
  }

  const charCount = message.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50" onClick={handleClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-2xl bg-app-card pb-8 shadow-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div className="mx-auto mb-2 mt-2 h-1 w-10 rounded-full bg-app-border" />
            <div className="flex items-center justify-between px-5 py-2 border-b border-app-border/50">
              <button onClick={handleClose} className="text-sm text-app-text-muted hover:text-app-text">취소</button>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold", i <= stepIndex ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted")}>{i + 1}</div>
                    <span className={cn("text-[10px]", i === stepIndex ? "text-app-text font-medium" : "text-app-text-muted")}>{s.label}</span>
                    {i < 2 && <div className={cn("h-px w-4", i < stepIndex ? "bg-app-primary" : "bg-app-border")} />}
                  </div>
                ))}
              </div>
              <div className="w-10" />
            </div>
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              {step === "account" && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">발송 계정 선택</p>
                  <button onClick={() => { setSelectedAccount("demo"); setStep("message"); }} className="flex items-center gap-3 w-full rounded-xl border border-app-border bg-app-card p-4 hover:bg-app-card-hover active:scale-[0.98] transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20"><Users className="h-5 w-5 text-emerald-400" /></div>
                    <div className="text-left"><p className="text-sm font-medium text-app-text">+82 10-1234-5678</p><p className="text-[11px] text-app-text-muted">오늘 12회 발송</p></div>
                  </button>
                  <button onClick={() => { setSelectedAccount("demo2"); setStep("message"); }} className="flex items-center gap-3 w-full rounded-xl border border-app-border bg-app-card p-4 hover:bg-app-card-hover active:scale-[0.98] transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20"><Users className="h-5 w-5 text-emerald-400" /></div>
                    <div className="text-left"><p className="text-sm font-medium text-app-text">+82 10-9876-5432</p><p className="text-[11px] text-app-text-muted">오늘 7회 발송</p></div>
                  </button>
                </div>
              )}
              {step === "message" && (
                <div className="space-y-3">
                  {/* Template chips */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {TEMPLATE_CHIPS.map(t => (
                      <button key={t} onClick={() => setMessage(t)} className="shrink-0 rounded-full border border-app-border bg-app-card-hover px-3 py-1.5 text-[11px] text-app-text-muted hover:border-app-primary/30 hover:text-app-text active:scale-95">{t}</button>
                    ))}
                  </div>

                  <p className="text-sm font-semibold">발송할 메시지</p>
                  <div className="relative">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="메시지를 입력하세요..." rows={6} autoFocus
                      className="w-full rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm text-app-text outline-none resize-none" aria-label="발송 메시지" />
                    <span className="absolute bottom-2 right-3 text-[10px] text-app-text-muted">{charCount}자</span>
                  </div>

                  {/* Attachment + Scheduled send row */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-card-hover px-3 py-2 text-[11px] text-app-text-muted hover:text-app-text active:scale-95">
                      <Paperclip className="h-4 w-4" />
                      {imageFile ? imageFile.name : "첨부"}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setImageFile(f); e.target.value = ""; }} />

                    <button onClick={() => setScheduled(!scheduled)} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] active:scale-95", scheduled ? "border-app-primary bg-app-primary-muted text-app-primary" : "border-app-border bg-app-card-hover text-app-text-muted")}>
                      <Calendar className="h-4 w-4" />
                      예약발송
                    </button>
                  </div>

                  {scheduled && (
                    <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                      className="w-full rounded-xl border border-app-border bg-app-card px-4 py-2.5 text-sm text-app-text outline-none" />
                  )}
                </div>
              )}
              {step === "confirm" && (
                <div className="space-y-4 text-center">
                  <p className="text-sm font-semibold">발송 확인</p>
                  <div className="rounded-xl bg-app-card-hover p-4 text-left space-y-2">
                    <p className="text-xs text-app-text-muted">계정: {selectedAccount}</p>
                    <p className="text-sm text-app-text line-clamp-3">{message}</p>
                    {imageFile && <p className="text-xs text-app-text-muted">이미지 첨부: {imageFile.name}</p>}
                    {scheduled && scheduledTime && <p className="text-xs text-app-text-muted">예약: {scheduledTime}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pt-2">
              {step === "account" && !selectedAccount && (
                <button disabled className="w-full rounded-xl bg-app-primary/50 py-3.5 text-sm font-semibold text-white">계정을 선택해주세요</button>
              )}
              {step === "confirm" && (
                <button onClick={handleSend} disabled={sending} className="w-full rounded-xl bg-app-primary py-3.5 text-sm font-semibold text-white disabled:opacity-50 active:scale-[0.98] transition-all">
                  {sending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : sent ? "전송 완료!" : "발송하기"}
                </button>
              )}
              {(step === "message" || (step === "account" && selectedAccount)) && (
                <button onClick={() => setStep(step === "account" ? "message" : "confirm")}
                  className="w-full rounded-xl bg-app-primary py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-all">
                  {step === "message" ? "다음" : "발송하기"}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
