"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Favorite { id: string; type: "account" | "group" | "action"; label: string; }
interface FavoriteStore { items: Favorite[]; toggle: (f: Favorite) => void; has: (id: string) => boolean; }

export const useFavoriteStore = create<FavoriteStore>()(persist(
  (set, get) => ({
    items: [],
    toggle: (f) => set(s => ({ items: get().has(f.id) ? s.items.filter(x => x.id !== f.id) : [...s.items, f].slice(0, 10) })),
    has: (id) => get().items.some(x => x.id === id),
  }),
  { name: "teleminiapp-favorites" }
));
