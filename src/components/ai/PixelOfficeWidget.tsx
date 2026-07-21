"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";

const EMPLOYEES = [
  { id: "e1", name: "티나", emoji: "👩‍💻", color: "#3b82f6", status: "working" as const },
  { id: "e2", name: "레오", emoji: "🧑‍💼", color: "#22c55e", status: "working" as const },
  { id: "e3", name: "아라", emoji: "👩‍🔬", color: "#a855f7", status: "meeting" as const },
  { id: "e4", name: "마크", emoji: "🧑‍💻", color: "#f97316", status: "coffee" as const },
  { id: "e5", name: "루나", emoji: "👩‍🎨", color: "#ec4899", status: "eating" as const },
  { id: "e6", name: "제이", emoji: "🧑‍💼", color: "#14b8a6", status: "working" as const },
];

const WIDGET_COLS = 20;
const WIDGET_ROWS = 10;

const WIDGET_MAP: number[][] = Array.from({ length: WIDGET_ROWS }, (_, y) =>
  Array.from({ length: WIDGET_COLS }, (_, x) => {
    if (y === 0 || y === WIDGET_ROWS - 1 || x === 0 || x === WIDGET_COLS - 1) return 9;
    if (x === 4 && y === 2) return 1;
    if (x === 8 && y === 2) return 2;
    if (x === 12 && y === 2) return 3;
    if (x === 16 && y === 2) return 4;
    if (x >= 6 && x <= 14 && y === 5) return 5;
    if (x === 3 && y === 7) return 6;
    if (x === 17 && y === 7) return 7;
    if ((x === 1 || x === WIDGET_COLS - 2) && (y === 1 || y === WIDGET_ROWS - 2)) return 8;
    return 0;
  })
);

const TILE = 16;
const COLORS = ["#2a2a3e","#3b82f6","#22c55e","#a855f7","#f97316","#6366f1","#d97706","#06b6d4","#15803d","#1e1e2e"];

interface PixelOfficeWidgetProps {
  onExpand?: () => void;
  compact?: boolean;
}

export function PixelOfficeWidget({ onExpand, compact }: PixelOfficeWidgetProps) {
  const [tick, setTick] = useState(0);
  const accounts = useDashboardStore((s) => s.accounts);
  const [hoveredEmp, setHoveredEmp] = useState<string | null>(null);
  const totalSent = accounts?.reduce((sum, a) => sum + (a.todaySent || 0), 0) || 0;

  const charPositions = useRef<Record<string, { x: number; y: number }>>({
    e1: { x: 4, y: 2 }, e2: { x: 8, y: 2 }, e3: { x: 12, y: 2 },
    e4: { x: 16, y: 2 }, e5: { x: 3, y: 7 }, e6: { x: 17, y: 7 },
  });

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(interval);
  }, []);

  const hour = Math.floor((tick * 37) % 24);
  const min = Math.floor((tick * 13) % 60);
  const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  const isNight = hour < 7 || hour >= 19;

  useEffect(() => {
    EMPLOYEES.forEach((emp) => {
      const pos = charPositions.current[emp.id];
      if (!pos) return;
      const dx = Math.floor(Math.random() * 3) - 1;
      const dy = Math.floor(Math.random() * 3) - 1;
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx > 0 && nx < WIDGET_COLS - 1 && ny > 0 && ny < WIDGET_ROWS - 1) {
        const tile = WIDGET_MAP[ny]?.[nx];
        if (tile === 0 || tile === 10) {
          pos.x = nx;
          pos.y = ny;
        }
      }
    });
  }, [tick]);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 py-1 overflow-x-auto">
        {EMPLOYEES.map((emp) => {
          return (
            <button key={emp.id}
              onMouseEnter={() => setHoveredEmp(emp.id)}
              onMouseLeave={() => setHoveredEmp(null)}
              className="relative flex flex-col items-center"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all" style={{ backgroundColor: emp.color + "40" }}>
                {emp.emoji}
              </div>
              {hoveredEmp === emp.id && (
                <div className="absolute -top-8 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[8px] text-white z-20">
                  {emp.name} · {emp.status}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-app-border bg-[#1a1a2e]">
      {isNight && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f1a] to-transparent opacity-60" />
      )}
      {isNight && Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="absolute h-0.5 w-0.5 rounded-full bg-white/40 animate-pulse" style={{ top: `${Math.random() * 30}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }} />
      ))}

      <div className="relative" style={{ width: WIDGET_COLS * TILE, height: WIDGET_ROWS * TILE, margin: "0 auto" }}>
        {WIDGET_MAP.flatMap((row, y) => row.map((tile, x) => (
          <div key={`${x}-${y}`} className="absolute transition-colors" style={{
            left: x * TILE, top: y * TILE, width: TILE, height: TILE,
            backgroundColor: COLORS[tile] + "40",
            border: tile === 9 ? "1px solid #2a2a4a" : undefined,
          }}>
            {tile === 1 && <span className="absolute inset-0 flex items-center justify-center text-[7px] opacity-30">🖥️</span>}
            {tile === 5 && <span className="absolute inset-0 flex items-center justify-center text-[7px] opacity-30">▤</span>}
            {tile === 6 && <span className="absolute inset-0 flex items-center justify-center text-[7px] opacity-40">🍽️</span>}
            {tile === 7 && <span className="absolute inset-0 flex items-center justify-center text-[7px] opacity-40">☕</span>}
            {tile === 8 && <span className="absolute inset-0 flex items-center justify-center text-[7px] opacity-50">🌿</span>}
          </div>
        )))}

        {EMPLOYEES.map((emp) => {
          const pos = charPositions.current[emp.id];
          if (!pos) return null;
          return (
            <motion.div key={emp.id}
              className="absolute z-10 transition-all duration-500 cursor-pointer"
              style={{ left: pos.x * TILE - 2, top: pos.y * TILE - 6 }}
              animate={{ y: [0, -1, 0] }}
              transition={{ repeat: Infinity, duration: 2 + Math.random() }}
              onMouseEnter={() => setHoveredEmp(emp.id)}
              onMouseLeave={() => setHoveredEmp(null)}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-sm text-[10px]" style={{ backgroundColor: emp.color + "60" }}>
                {emp.emoji}
              </div>
              {hoveredEmp === emp.id && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[7px] text-white/90 z-20">
                  {emp.name}
                </div>
              )}
            </motion.div>
          );
        })}

        <div className="absolute top-1 left-[30%] z-10 flex items-center gap-1 rounded-sm bg-black/40 px-1.5 py-0.5 text-[6px] text-white/60">
          📨 {totalSent}
        </div>

        <div className="absolute bottom-1 right-1 z-10 flex items-center gap-0.5 rounded-sm bg-black/40 px-1 py-0.5 text-[6px] text-white/50">
          {timeStr}
        </div>
      </div>

      {onExpand && (
        <button onClick={onExpand} className="absolute top-1 right-1 z-20 flex h-4 w-4 items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white/50 transition-colors">
          <Maximize2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
