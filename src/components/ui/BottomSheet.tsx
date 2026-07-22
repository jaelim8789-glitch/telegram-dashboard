"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (touch.clientY > rect.top + 60) return;
    startYRef.current = touch.clientY;
    swipingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!swipingRef.current) return;
    const dy = e.changedTouches[0].clientY - startYRef.current;
    if (dy > 80) {
      swipingRef.current = false;
      onClose();
    }
  }, [onClose]);

  const handleTouchEnd = useCallback(() => {
    swipingRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [open, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-app-bg shadow-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-bg/95 backdrop-blur-sm px-4 py-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-app-border" />
              {title && <span className="text-sm font-semibold text-app-text">{title}</span>}
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-app-card-hover transition-colors" aria-label="닫기">
                <X className="h-4 w-4 text-app-text-muted" />
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
