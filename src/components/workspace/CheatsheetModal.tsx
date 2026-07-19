"use client";

import { useId, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface CheatsheetModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], desc: "명령 팔레트 열기" },
  { keys: ["Ctrl", "Enter"], desc: "현재 폼 제출 (발송 등)" },
  { keys: ["Alt", "1"], desc: "대시보드 탭" },
  { keys: ["Alt", "2"], desc: "발송 탭" },
  { keys: ["Alt", "3"], desc: "스케줄러 탭" },
  { keys: ["Alt", "4"], desc: "로그 탭" },
  { keys: ["Alt", "5"], desc: "전달 분석 탭" },
  { keys: ["Alt", "6"], desc: "계정 등록 탭" },
  { keys: ["Alt", "7"], desc: "그룹 탭" },
  { keys: ["Alt", "8"], desc: "그룹 검색 탭" },
  { keys: ["Alt", "9"], desc: "자동 응답 탭" },
  { keys: ["Escape"], desc: "모달/팝업 닫기" },
  { keys: ["?"], desc: "이 도움말 열기" },
];

export function CheatsheetModal({ open, onClose }: CheatsheetModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(panelRef, open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id={titleId} className="text-lg font-semibold text-app-text">단축키</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-app-card-hover transition-colors"
                >
                  <span className="text-app-text">{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <span key={j}>
                        <kbd className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-app-border bg-app-card px-1.5 py-0.5 text-[11px] font-mono font-medium text-app-text-muted shadow-sm">
                          {k}
                        </kbd>
                        {j < s.keys.length - 1 && (
                          <span className="mx-1 text-app-text-subtle text-[11px]">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-app-text-subtle text-center">
              Tab 간 이동은 {`Alt+1`}~{`Alt+9`}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}