"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  const dragY = useRef(0);

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
            className="relative w-full rounded-t-2xl bg-white shadow-xl pb-safe"
            style={{ height: "100vh" }}
          >
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-amber-400" />
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-8" style={{ height: "calc(100% - 64px)" }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
