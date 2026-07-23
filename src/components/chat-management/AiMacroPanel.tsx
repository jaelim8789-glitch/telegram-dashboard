"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { AiMacro } from "./mockData";

interface AiMacroPanelProps {
  macros: AiMacro[];
  onToggle: (id: string, enabled: boolean) => void;
}

function MacroToggle({
  macro,
  checked,
  onChange,
}: {
  macro: AiMacro;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-app-border/50 transition-shadow hover:shadow-lg hover:shadow-purple-500/5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-app-text">{macro.label}</div>
        <div className="text-xs font-normal text-app-text-subtle">{macro.description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-violet-500/40",
          checked ? "bg-violet-500" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-150",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

interface ToastItem {
  id: string;
  label: string;
  enabled: boolean;
}

export function AiMacroPanel({ macros, onToggle }: AiMacroPanelProps) {
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const m of macros) {
      init[m.id] = m.enabled;
    }
    return init;
  });
  const [toast, setToast] = useState<ToastItem | null>(null);

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      setLocal((prev) => ({ ...prev, [id]: enabled }));
      onToggle(id, enabled);
      const macro = macros.find((m) => m.id === id);
      if (macro) {
        setToast({ id: `${macro.id}-${Date.now()}`, label: macro.label, enabled });
      }
    },
    [macros, onToggle]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="relative flex h-full w-[260px] shrink-0 flex-col border-l border-violet-500/20 bg-app-surface">
      <div className="border-b border-violet-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold tracking-tight text-app-text">AI 매크로</h2>
        </div>
        <p className="mt-0.5 text-[11px] font-normal text-app-text-muted">
          수신 메시지 자동 처리 설정
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-1">
        {macros.map((macro) => (
          <MacroToggle
            key={macro.id}
            macro={macro}
            checked={local[macro.id] ?? false}
            onChange={(enabled) => handleToggle(macro.id, enabled)}
          />
        ))}
      </div>

      <div className="border-t border-violet-500/20 p-3">
        <p className="text-[10px] font-normal text-app-text-subtle">
          AI 매크로는 텔레그램 봇을 통해 자동 실행됩니다
        </p>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 6, x: "-50%" }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 left-1/2 z-20 whitespace-nowrap rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-violet-500/30"
          >
            {toast.label} {toast.enabled ? "켜짐" : "꺼짐"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
