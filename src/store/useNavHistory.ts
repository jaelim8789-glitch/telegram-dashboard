"use client";

import { create } from "zustand";
import type { NavView } from "@/types";

interface TabHistoryEntry { tabId: string; view: NavView; label?: string; timestamp: number; }
interface NavHistoryState { stack: TabHistoryEntry[]; push: (entry: Omit<TabHistoryEntry, "timestamp">) => void; pop: () => TabHistoryEntry | null; peek: () => TabHistoryEntry | null; clear: () => void; }

export const useNavHistory = create<NavHistoryState>((set, get) => ({
  stack: [],
  push: (entry) => set(s => ({ stack: [...s.stack.slice(-20), { ...entry, timestamp: Date.now() }] })),
  pop: () => {
    const st = get().stack;
    if (st.length < 2) return null;
    const current = st[st.length - 1];
    const prev = st[st.length - 2];
    set({ stack: st.slice(0, -1) });
    return prev.tabId !== current.tabId ? prev : st.length > 2 ? st[st.length - 3] : null;
  },
  peek: () => get().stack.length > 1 ? get().stack[get().stack.length - 2] : null,
  clear: () => set({ stack: [] }),
}));
