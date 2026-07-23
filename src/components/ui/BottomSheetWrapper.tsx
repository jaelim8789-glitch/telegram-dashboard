"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface BottomSheetWrapperProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  snapPoints?: string[];
  className?: string;
}

export function BottomSheetWrapper({ open, onClose, title, children, snapPoints = ["50%", "85%"], className }: BottomSheetWrapperProps) {
  const [snap, setSnap] = useState(0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className={cn("fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-app-card pb-8 shadow-2xl", className)}
            style={{ height: snapPoints[snap], paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-app-border cursor-grab active:cursor-grabbing" />
            {title && (
              <div className="flex items-center justify-between px-5 py-2 border-b border-app-border/50">
                <span className="text-sm font-semibold text-app-text">{title}</span>
                <button onClick={onClose} className="text-sm text-app-text-muted hover:text-app-text">닫기</button>
              </div>
            )}
            <div className="px-5 py-3 overflow-y-auto" style={{ height: `calc(${snapPoints[snap]} - 60px)` }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
