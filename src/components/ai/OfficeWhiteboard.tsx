"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Edit3, Pin, MessageCircle } from "lucide-react";

interface Memo {
  id: string;
  text: string;
  author: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

const COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#eab308"];

function loadMemos(): Memo[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("office_whiteboard") || "[]"); }
  catch { return []; }
}

const AI_MEMOS = [
  { text: "이번 주 목표: 1000건 발송!", color: "#22c55e" },
  { text: "수요일 저녁 프로모션 준비", color: "#3b82f6" },
  { text: "내일 팀 회의 15:00", color: "#a855f7" },
  { text: "🎉 이번 달 매출 목표 달성!", color: "#eab308" },
  { text: "⚠️ VIP 고객 응대 주의", color: "#f97316" },
  { text: "AI 자동 응답 업데이트 예정", color: "#ec4899" },
];

export function OfficeWhiteboard() {
  const [memos, setMemos] = useState<Memo[]>(() => {
    const saved = loadMemos();
    if (saved.length === 0) {
      return AI_MEMOS.slice(0, 3).map((m, i) => ({
        id: `ai-${i}`, text: m.text, author: "AI", color: m.color,
        pinned: i < 2, createdAt: new Date().toISOString(),
      }));
    }
    return saved;
  });
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    localStorage.setItem("office_whiteboard", JSON.stringify(memos));
  }, [memos]);

  const addMemo = () => {
    if (!inputText.trim()) return;
    const newMemo: Memo = {
      id: Date.now().toString(),
      text: inputText.trim(),
      author: "나",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    setMemos((prev) => [newMemo, ...prev]);
    setInputText("");
    setShowInput(false);
  };

  const removeMemo = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  const togglePin = (id: string) => {
    setMemos((prev) => prev.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m));
  };

  const sorted = [...memos].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));

  return (
    <div className="rounded-2xl border border-app-border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Edit3 className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs font-semibold text-app-text">화이트보드</span>
        </div>
        <button onClick={() => setShowInput(!showInput)} className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-1 text-[9px] text-yellow-500 hover:bg-yellow-500/20 transition-colors">
          <Plus className="h-3 w-3" /> 메모 추가
        </button>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2">
            <div className="flex gap-1">
              <input value={inputText} onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMemo()}
                placeholder="메모 내용 입력..."
                className="flex-1 rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-[11px] text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-yellow-500"
                autoFocus
              />
              <button onClick={addMemo} className="rounded-lg bg-yellow-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-yellow-600 transition-colors">
                추가
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {sorted.map((memo) => (
          <motion.div key={memo.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 rounded-lg p-2" style={{ backgroundColor: memo.color + "15", borderLeft: `2px solid ${memo.color}` }}
          >
            <p className="flex-1 text-[10px] leading-relaxed text-app-text break-words">{memo.text}</p>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => togglePin(memo.id)} className={`flex h-4 w-4 items-center justify-center rounded hover:bg-white/10 transition-colors ${memo.pinned ? "text-yellow-400" : "text-white/20"}`}>
                <Pin className="h-2.5 w-2.5" />
              </button>
              <button onClick={() => removeMemo(memo.id)} className="flex h-4 w-4 items-center justify-center rounded hover:bg-white/10 text-white/20 hover:text-red-400 transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </motion.div>
        ))}
        {memos.length === 0 && (
          <p className="text-center text-[10px] text-app-text-muted py-4">메모를 추가해보세요!</p>
        )}
      </div>
    </div>
  );
}
