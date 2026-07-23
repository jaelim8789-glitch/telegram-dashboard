"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GoalProgress({ current, target, label = "오늘 목표" }: { current: number; target: number; label?: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const [show, setShow] = useState(false);

  return (
    <button onClick={() => setShow(!show)} className="w-full rounded-xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{label}</span>
        <span className="text-xs font-bold text-emerald-400">{current}/{target}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-gray-700">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500"}`} />
      </div>
      <span className="text-[10px] mt-1 block text-right" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{pct}%</span>
    </button>
  );
}
