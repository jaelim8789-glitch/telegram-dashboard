"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-app-card px-3.5 py-1.5 text-xs font-medium text-app-text-muted hover:bg-app-card-hover transition-colors"
      >
        <FileDown className="h-3.5 w-3.5" />
        <span>내보내기</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 rounded-xl border border-app-border bg-app-card shadow-xl z-50 overflow-hidden"
          >
            <button
              onClick={() => setOpen(false)}
              className="w-full px-4 py-2.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover transition-colors flex items-center gap-2"
            >
              CSV로 내보내기
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full px-4 py-2.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover transition-colors flex items-center gap-2"
            >
              PDF로 내보내기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
