"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE_STYLE = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_STYLE;
  /** Set while an in-flight action (e.g. a confirm submit) is pending — disables
   * the backdrop/Escape/close-button dismissal so users can't lose the pending
   * action's context. Defaults to false. */
  preventClose?: boolean;
  className?: string;
}

let openModalCount = 0;

/**
 * Minimal controlled dialog primitive: portal-rendered, focus-trapped,
 * Escape/backdrop dismissible (unless `preventClose`), restores focus to the
 * trigger element on close, and locks body scroll while open. Built on
 * framer-motion (already a project dependency) rather than adding a new one.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  preventClose = false,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => setMounted(true), []);

  // Body scroll lock + focus capture/restore, scoped so nested modals don't
  // fight over the lock (only the last one to close removes it).
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    openModalCount += 1;
    document.body.classList.add("modal-open");

    const frame = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? dialogRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.classList.remove("modal-open");
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Escape to close + Tab focus trap.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (preventClose) return;
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, preventClose, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => !preventClose && onClose()}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={cn(
              "relative flex max-h-[85dvh] w-full flex-col rounded-2xl border border-app-border bg-app-card shadow-2xl",
              "scrollbar-thin",
              "mx-auto max-w-[calc(100vw-2rem)] sm:max-w-none",
              SIZE_STYLE[size],
              "before:absolute before:inset-0 before:rounded-2xl before:border before:border-[var(--color-accent-border)] before:opacity-20 before:pointer-events-none",
              className
            )}
          >
            {(title || !preventClose) && (
              <div className="flex items-start justify-between gap-3 border-b border-app-border px-5 py-4">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-sm font-semibold text-app-text">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="mt-0.5 text-xs text-app-text-muted">
                      {description}
                    </p>
                  )}
                </div>
                {!preventClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-app-border px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
