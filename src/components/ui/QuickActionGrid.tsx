"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

export function QuickActionGrid({ onAction }: { onAction: (action: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const actions = [
    { id: "connect-account", label: "계정 연결", icon: "📱", color: "from-blue-500 to-blue-600" },
    { id: "quick-send", label: "빠른 발송", icon: "✉️", color: "from-emerald-500 to-emerald-600" },
    { id: "ai-chat", label: "AI 문의", icon: "🤖", color: "from-purple-500 to-purple-600" },
    { id: "view-logs", label: "로그 보기", icon: "📋", color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-medium mb-2" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} 빠른 작업
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-4 gap-2 overflow-hidden">
            {actions.map(a => (
              <button key={a.id} onClick={() => onAction(a.id)} className={`flex flex-col items-center gap-1 rounded-xl py-3 active:scale-95 bg-gradient-to-br text-white ${a.color}`}>
                <span className="text-lg">{a.icon}</span>
                <span className="text-[9px] font-medium">{a.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
