"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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
    <div className="flex items-center justify-between gap-3 py-3 border-b border-app-border/50">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-app-text">{macro.label}</div>
        <div className="text-xs text-app-text-subtle">{macro.description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
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

export function AiMacroPanel({ macros, onToggle }: AiMacroPanelProps) {
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const m of macros) {
      init[m.id] = m.enabled;
    }
    return init;
  });

  function handleToggle(id: string, enabled: boolean) {
    setLocal((prev) => ({ ...prev, [id]: enabled }));
    onToggle(id, enabled);
  }

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-l border-violet-500/20 bg-app-surface">
      <div className="border-b border-violet-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-app-text">AI 매크로</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-app-text-muted">
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
        <p className="text-[10px] text-app-text-subtle">
          AI 매크로는 텔레그램 봇을 통해 자동 실행됩니다
        </p>
      </div>
    </div>
  );
}
