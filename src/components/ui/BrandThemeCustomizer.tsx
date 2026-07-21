"use client";

import { useState, useEffect } from "react";
import { Palette, Check, RotateCcw } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";

const PRESETS = [
  { name: "기본", accent: "#bfa260", primary: "#bfa260" },
  { name: "오션", accent: "#38bdf8", primary: "#38bdf8" },
  { name: "그린", accent: "#22c55e", primary: "#22c55e" },
  { name: "퍼플", accent: "#a855f7", primary: "#a855f7" },
  { name: "로즈", accent: "#f43f5e", primary: "#f43f5e" },
  { name: "오렌지", accent: "#f97316", primary: "#f97316" },
];

export function BrandThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const selectedAccent = useDashboardStore((s) => (s as any).accentColor) || "#bfa260";
  const setAccent = (color: string) => {
    document.documentElement.style.setProperty("--color-accent", color);
    document.documentElement.style.setProperty("--color-primary", color);
    try { localStorage.setItem("telemon-accent", color); } catch {}
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-app-border px-2 py-1 text-[10px] text-app-text-muted hover:text-app-text transition-colors">
        <Palette className="h-3.5 w-3.5" /> 테마
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-app-border bg-app-card p-2 shadow-lg animate-scale-in">
          <p className="text-[10px] font-medium text-app-text-muted px-1 mb-1">강조색</p>
          <div className="grid grid-cols-6 gap-1">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => setAccent(p.accent)}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-110"
                style={{ backgroundColor: p.accent }}
                title={p.name}>
                {selectedAccent === p.accent && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
          <button onClick={() => setAccent("#bfa260")}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-app-border px-2 py-1 text-[10px] text-app-text-muted hover:text-app-text transition-colors">
            <RotateCcw className="h-3 w-3" /> 기본 색상 복원
          </button>
        </div>
      )}
    </div>
  );
}
