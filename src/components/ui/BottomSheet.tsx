"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className = "" }: BottomSheetProps) {
  const y = useMotionValue(0);
  const controls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const backgroundOpacity = useTransform(y, [0, 300], [0.4, 0]);

  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    }
    y.set(0);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ opacity: backgroundOpacity }}
            className="absolute inset-0 bg-black"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            drag="y"
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={onDragEnd}
            style={{ y }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className={`relative w-full max-h-[85vh] flex flex-col rounded-t-2xl bg-app-card border-t border-[var(--color-accent-border)] shadow-2xl ${className}`}
          >
            {/* Drag handle */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
              <div className="mx-auto h-1 w-10 rounded-full bg-app-border cursor-grab active:cursor-grabbing touch-none" />
            </div>

            {title && (
              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                  {title}
                </h2>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1.5 text-app-text-muted hover:bg-[var(--color-accent-light)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="h-px mx-5 bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-30" />

            <div className="flex-1 overflow-y-auto px-5 py-4 pb-8">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
