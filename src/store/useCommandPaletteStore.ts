"use client";

import { create } from "zustand";

interface Command { id: string; label: string; icon?: string; action: string; category: string; }
interface CommandPaletteState { open: boolean; query: string; results: Command[]; setOpen: (o: boolean) => void; setQuery: (q: string) => void; setResults: (r: Command[]) => void; }

const DEFAULT_COMMANDS: Command[] = [
  { id: "1", label: "발송하기", action: "tab-send", category: "탭", icon: "✉️" },
  { id: "2", label: "계정 등록", action: "tab-register", category: "탭", icon: "➕" },
  { id: "3", label: "AI 채팅", action: "tab-myai", category: "탭", icon: "🤖" },
  { id: "4", label: "대시보드", action: "tab-dashboard", category: "탭", icon: "📊" },
  { id: "5", label: "새로고침", action: "refresh", category: "액션", icon: "🔄" },
  { id: "6", label: "다크모드 전환", action: "toggle-theme", category: "설정", icon: "🌙" },
];

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false, query: "", results: DEFAULT_COMMANDS,
  setOpen: (o) => set({ open: o, query: "", results: DEFAULT_COMMANDS }),
  setQuery: (q) => set(s => ({ query: q, results: q ? DEFAULT_COMMANDS.filter(c => c.label.includes(q) || c.category.includes(q)) : DEFAULT_COMMANDS })),
  setResults: (r) => set({ results: r }),
}));
