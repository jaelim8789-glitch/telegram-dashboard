"use client";

import { useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Maximize2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface WidgetDrilldownProps {
  children: ReactNode;
  /** Full-screen detail content when expanded */
  detailContent: ReactNode;
  /** Widget label shown in the header bar */
  label: string;
  className?: string;
}

export function WidgetDrilldown({
  children,
  detailContent,
  label,
  className,
}: WidgetDrilldownProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative w-full text-left focus:outline-none",
          "active:scale-[0.98] transition-transform",
          className,
        )}
      >
        {children}
        <div className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-app-card/80 text-app-text-muted opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
            className="fixed inset-0 z-50 flex flex-col bg-app-bg"
          >
            <div className="flex items-center gap-3 border-b border-app-border px-4 py-3 shrink-0">
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
                aria-label="뒤로 가기"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-sm font-semibold text-app-text">{label}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {detailContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
