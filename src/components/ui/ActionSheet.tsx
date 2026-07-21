"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Action {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: Action[];
  cancelLabel?: string;
}

export function ActionSheet({ open, onClose, title, actions, cancelLabel = "취소" }: ActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg px-2 pb-2"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="rounded-2xl bg-app-card border border-app-border shadow-2xl overflow-hidden">
              {title && (
                <div className="px-4 py-3 text-center border-b border-app-border/50">
                  <p className="text-[11px] font-medium text-app-text-muted">{title}</p>
                </div>
              )}
              <div className="max-h-60 overflow-y-auto">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => { action.onClick(); onClose(); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-app-card-hover transition-colors border-b border-app-border/30 last:border-b-0"
                  >
                    {action.icon && <span className="shrink-0 text-app-text-muted">{action.icon}</span>}
                    <span className={action.danger ? "text-app-danger font-medium" : "text-app-text"}>{action.label}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-app-border/50 p-1">
                <button
                  onClick={onClose}
                  className="w-full rounded-xl bg-app-card-hover py-3 text-sm font-semibold text-app-text hover:bg-app-border/30 transition-colors"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
