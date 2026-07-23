"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const SNAP_POINTS = [0.25, 0.5, 0.85];

interface MobileInspectorSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function MobileInspectorSheet({
  open,
  onClose,
  title,
  children,
}: MobileInspectorSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [snapIndex, setSnapIndex] = useState(1);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const handler = () => {
      const diff = window.innerHeight - vv.height;
      setKeyboardHeight(Math.max(0, diff - 60));
    };
    vv.addEventListener("resize", handler);
    handler();
    return () => vv.removeEventListener("resize", handler);
  }, [open]);

  useEffect(() => {
    if (!open || keyboardHeight === 0) return;
    const timer = setTimeout(() => {
      const active = document.activeElement as HTMLElement;
      if (active && active.tagName === "INPUT" || active?.tagName === "TEXTAREA") {
        active.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [open, keyboardHeight]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      const { offset, velocity } = info;
      const threshold = window.innerHeight * 0.1;

      if (velocity.y > 500) {
        onClose();
        return;
      }

      if (offset.y > threshold) {
        if (snapIndex > 0) {
          setSnapIndex(snapIndex - 1);
        } else {
          onClose();
        }
      } else if (offset.y < -threshold) {
        setSnapIndex(Math.min(snapIndex + 1, SNAP_POINTS.length - 1));
      }
    },
    [snapIndex, onClose]
  );

  useEffect(() => {
    if (open) setSnapIndex(1);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const sheetHeight = keyboardHeight > 0
    ? `calc(100vh - ${keyboardHeight}px)`
    : "100vh";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: window.innerHeight * 0.85 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: `${(1 - SNAP_POINTS[snapIndex]) * 100}%` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full rounded-t-2xl bg-app-surface shadow-xl pb-safe"
            style={{ height: sheetHeight }}
          >
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-app-border-strong" />
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="text-sm font-semibold text-app-text">{title}</h2>
              <button
                onClick={onClose}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-8 scrollbar-thin" style={{ height: "calc(100% - 56px)" }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
