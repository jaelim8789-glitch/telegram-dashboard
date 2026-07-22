"use client";

import { motion, AnimatePresence } from "framer-motion";

interface WidgetDrilldownProps {
  open: boolean;
  children: React.ReactNode;
  title: string;
  onBack: () => void;
}

export default function WidgetDrilldown({
  open,
  children,
  title,
  onBack,
}: WidgetDrilldownProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-40 flex flex-col bg-white"
        >
          <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
