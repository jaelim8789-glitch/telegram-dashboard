"use client";

import { create } from "zustand";

const RECENT_KEY = "telemon-cmd-recent";
const MAX_RECENT = 5;

interface PaletteState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  recent: string[];
  addRecent: (id: string) => void;
  clearRecent: () => void;
}

function loadRecent(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(recent: string[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    /* noop */
  }
}

export const useCommandPaletteStore = create<PaletteState>((set, get) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((state) => ({ open: !state.open })),
  recent: loadRecent(),
  addRecent: (id) => {
    const next = [id, ...get().recent.filter((item) => item !== id)].slice(0, MAX_RECENT);
    saveRecent(next);
    set({ recent: next });
  },
  clearRecent: () => {
    saveRecent([]);
    set({ recent: [] });
  },
}));
