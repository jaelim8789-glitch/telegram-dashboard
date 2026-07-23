"use client";

import { create } from "zustand";

interface StatQuery { period: "today" | "week" | "month"; accountId?: string; date?: string; }
interface StatState { query: StatQuery; setQuery: (q: Partial<StatQuery>) => void; }

export const useStatQuery = create<StatState>((set) => ({
  query: { period: "today" },
  setQuery: (q) => set(s => ({ query: { ...s.query, ...q } })),
}));
