"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ConfirmAction({ open, title, description, confirmLabel = "확인", cancelLabel = "취소", variant = "danger", onConfirm, onCancel }: {
  open: boolean; title: string; description?: string; confirmLabel?: string; cancelLabel?: string; variant?: "danger" | "primary"; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={onCancel} />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-app-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-app-text mb-1">{title}</h3>
              {description && <p className="text-xs text-app-text-muted mb-4">{description}</p>}
              <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 rounded-xl border border-app-border py-2.5 text-sm font-medium text-app-text-muted active:scale-[0.98]">{cancelLabel}</button>
                <button onClick={onConfirm} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-[0.98]" style={{ backgroundColor: variant === "danger" ? "var(--color-danger)" : "var(--color-accent)" }}>{confirmLabel}</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useConfirmAction() {
  const [state, setState] = useState<{ open: boolean; title: string; description?: string; onConfirm?: () => void }>({ open: false, title: "" });
  const confirm = useCallback((title: string, onConfirm: () => void, description?: string) => setState({ open: true, title, description, onConfirm }), []);
  const handleConfirm = useCallback(() => { state.onConfirm?.(); setState(s => ({ ...s, open: false })); }, [state.onConfirm]);
  const cancel = useCallback(() => setState(s => ({ ...s, open: false })), []);
  return { confirm, ConfirmDialog: <ConfirmAction open={state.open} title={state.title} description={state.description} onConfirm={handleConfirm} onCancel={cancel} /> };
}
