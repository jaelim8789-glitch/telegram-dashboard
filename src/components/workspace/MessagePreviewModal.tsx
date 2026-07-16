"use client";

import { useEffect, useRef, useMemo } from "react";
import { X, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TEMPLATE_VARIABLES,
  previewTemplate,
} from "@/lib/messageTemplates";

interface MessagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  recipientCount: number;
  accountPhone?: string;
  groupName?: string;
}

export function MessagePreviewModal({
  open,
  onClose,
  message,
  recipientCount,
  accountPhone,
  groupName,
}: MessagePreviewModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const preview = useMemo(
    () =>
      previewTemplate(message, {
        name: groupName ?? "샘플 그룹",
        phone: accountPhone ?? "010-0000-0000",
        count: recipientCount ?? 10,
      }),
    [message, groupName, accountPhone, recipientCount],
  );

  const hasVariables = useMemo(
    () => TEMPLATE_VARIABLES.some((v) => message.includes(v.key)),
    [message],
  );

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
            role="button"
            tabIndex={-1}
            aria-label="닫기"
          />
          {/* Panel */}            <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-dialog-title"
            className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="preview-dialog-title" className="flex items-center gap-2 text-lg font-semibold text-app-text">
                <Eye className="h-5 w-5 text-app-primary" />
                메시지 미리보기
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview content */}
            <div className="rounded-xl border border-app-border bg-app-card p-4">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-app-text">
                {preview || (
                  <span className="text-app-text-muted italic">메시지 내용이 비어 있습니다.</span>
                )}
              </div>
            </div>

            {/* Variable substitution info */}
            {hasVariables && (
              <div className="mt-3 rounded-xl border border-app-info/20 bg-app-info-muted/10 px-3 py-2">
                <p className="text-[11px] font-medium text-app-info">변수 치환 예시</p>
                <div className="mt-1 space-y-0.5">
                  {TEMPLATE_VARIABLES.filter((v) => message.includes(v.key)).map((v) => {
                    let sample: string;
                    switch (v.key) {
                      case "{{name}}":
                        sample = groupName ?? "샘플 그룹";
                        break;
                      case "{{phone}}":
                        sample = accountPhone ?? "010-0000-0000";
                        break;
                      case "{{count}}":
                        sample = String(recipientCount ?? 10);
                        break;
                      default:
                        sample = "[값]";
                    }
                    return (
                      <div key={v.key} className="flex items-center gap-2 text-[11px] text-app-text-muted">
                        <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[10px] text-app-info">
                          {v.key}
                        </code>
                        <span className="text-app-text-subtle">→</span>
                        <span className="font-medium text-app-text">{sample}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!hasVariables && message.trim() && (
              <p className="mt-3 text-[11px] text-app-text-subtle text-center">
                변수({`{{name}}`}, {`{{phone}}`}, {`{{count}}`})를 사용하면 동적인 메시지를 만들 수 있습니다.
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}