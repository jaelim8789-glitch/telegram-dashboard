"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export function TimeMachine({ onDateSelect, className }: { onDateSelect: (date: string) => void; className?: string }) {
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function handleSelect() {
    onDateSelect(date);
    setShow(false);
  }

  return (
    <div className={`relative ${className || ""}`}>
      <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-[11px] text-app-text-muted hover:text-app-text active:scale-95">
        <Calendar className="h-3.5 w-3.5" /> 과거 보기
      </button>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-app-border bg-app-card p-4 shadow-xl">
            <p className="text-xs font-semibold text-app-text mb-2">날짜 선택</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none" />
            <button onClick={handleSelect} className="mt-2 w-full rounded-lg bg-app-primary py-2 text-xs font-semibold text-white active:scale-[0.98]">적용</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
