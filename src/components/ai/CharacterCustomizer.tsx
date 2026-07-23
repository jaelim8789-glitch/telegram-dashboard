"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

const HATS = ["", "🎩", "🧢", "👑", "🎓", "🪖"];
const GLASSES = ["", "👓", "🕶️", "🥽"];
const COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6", "#eab308", "#ef4444"];
const COLOR_NAMES = ["블루", "그린", "퍼플", "오렌지", "핑크", "민트", "골드", "레드"];

interface CharCustom {
  hat: string;
  glasses: string;
  color: string;
}

interface CharacterCustomizerProps {
  employeeId: string;
  employeeEmoji: string;
  employeeName: string;
  onClose: () => void;
}

function loadCustomizations(): Record<string, CharCustom> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("pixel_custom") || "{}");
  } catch { return {}; }
}

function saveCustomizations(data: Record<string, CharCustom>) {
  localStorage.setItem("pixel_custom", JSON.stringify(data));
}

export function CharacterCustomizer({ employeeId, employeeEmoji, employeeName, onClose }: CharacterCustomizerProps) {
  const [custom, setCustom] = useState<CharCustom>(() => {
    const all = loadCustomizations();
    return all[employeeId] || { hat: "", glasses: "", color: "" };
  });
  const previewEmoji = `${custom.hat || ""} ${employeeEmoji}`.trim();

  const update = (key: keyof CharCustom, value: string) => {
    const next = { ...custom, [key]: value };
    setCustom(next);
    const all = loadCustomizations();
    all[employeeId] = next;
    saveCustomizations(all);
  };

  const reset = () => {
    const all = loadCustomizations();
    delete all[employeeId];
    saveCustomizations(all);
    setCustom({ hat: "", glasses: "", color: "" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-app-border bg-app-card p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-app-primary" />
          <span className="text-xs font-semibold text-app-text">{employeeName} 꾸미기</span>
        </div>
        <button onClick={reset} className="flex items-center gap-1 text-[9px] text-app-text-muted hover:text-app-text">
          <RotateCcw className="h-3 w-3" /> 초기화
        </button>
      </div>

      {/* Preview */}
      <div className="flex justify-center mb-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/10 text-3xl transition-all" style={{ backgroundColor: custom.color || "#ffffff10" }}>
          {previewEmoji}
        </div>
      </div>

      {/* Hat */}
      <div className="mb-2">
        <p className="text-[9px] font-medium text-app-text-muted mb-1">🎩 모자</p>
        <div className="flex gap-1">
          {HATS.map((h) => (
            <button key={h || "none"} onClick={() => update("hat", h)}
              className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all", custom.hat === h ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:bg-app-card-hover")}
            >{h || "─"}</button>
          ))}
        </div>
      </div>

      {/* Glasses */}
      <div className="mb-2">
        <p className="text-[9px] font-medium text-app-text-muted mb-1">👓 안경</p>
        <div className="flex gap-1">
          {GLASSES.map((g) => (
            <button key={g || "none"} onClick={() => update("glasses", g)}
              className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all", custom.glasses === g ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:bg-app-card-hover")}
            >{g || "─"}</button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-[9px] font-medium text-app-text-muted mb-1">🎨 색상</p>
        <div className="flex gap-1">
          {COLORS.map((c, i) => (
            <button key={c} onClick={() => update("color", c)}
              className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[7px] font-semibold text-white transition-all", custom.color === c ? "ring-2 ring-white scale-110" : "")}
              style={{ backgroundColor: c }}
            >{COLOR_NAMES[i]?.charAt(0)}</button>
          ))}
          <button onClick={() => update("color", "")}
            className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[9px] transition-all", !custom.color ? "ring-2 ring-app-primary" : "bg-app-card-hover text-app-text-muted")}
          >🎨</button>
        </div>
      </div>

      <button onClick={onClose} className="w-full mt-3 rounded-lg bg-app-card-hover py-1.5 text-[10px] text-app-text-muted hover:text-app-text transition-colors">완료</button>
    </motion.div>
  );
}
