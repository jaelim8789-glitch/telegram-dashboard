"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentItem { id: string; type: "account" | "group" | "broadcast" | "template"; label: string; usedAt: number; }

interface RecentStore { items: RecentItem[]; use: (item: Omit<RecentItem, "usedAt">) => void; getRecent: (type?: string, limit?: number) => RecentItem[]; }

export const useRecentStore = create<RecentStore>()(persist(
  (set, get) => ({
    items: [],
    use: (item) => set(s => {
      const filtered = s.items.filter(x => !(x.id === item.id && x.type === item.type));
      return { items: [{ ...item, usedAt: Date.now() }, ...filtered].slice(0, 30) };
    }),
    getRecent: (type, limit = 5) => {
      const all = get().items;
      return type ? all.filter(x => x.type === type).slice(0, limit) : all.slice(0, limit);
    },
  }),
  { name: "telemon-recent-items" }
));
