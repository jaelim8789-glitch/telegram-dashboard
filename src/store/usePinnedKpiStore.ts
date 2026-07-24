"use client";

import { create } from "zustand";

export interface PinnedKpiDefinition {
  id: string;
  label: string;
  icon: string;
  getValue: () => string;
  getSparkline: () => number[];
}

const STORAGE_KEY = "telemon-pinned-kpis";

function loadPinned(): string[] {
  if (typeof localStorage === "undefined") return ["todaySent", "successRate", "activeAccounts"];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ["todaySent", "successRate", "activeAccounts"];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((i: unknown) => typeof i === "string")) return parsed;
  } catch (e) { console.warn('Unhandled error in usePinnedKpiStore', e) }
  return ["todaySent", "successRate", "activeAccounts"];
}

function persistPinned(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (e) { console.warn('Unhandled error in usePinnedKpiStore', e) }
}

interface PinnedKpiState {
  pinnedIds: string[];
  order: string[];
  collapsed: boolean;
  pin: (kpiId: string) => void;
  unpin: (kpiId: string) => void;
  reorder: (from: number, to: number) => void;
  toggleCollapsed: () => void;
}

export const usePinnedKpiStore = create<PinnedKpiState>((set) => ({
  pinnedIds: loadPinned(),
  order: loadPinned(),
  collapsed: false,

  pin: (kpiId) =>
    set((s) => {
      if (s.pinnedIds.includes(kpiId)) return s;
      const next = [...s.pinnedIds, kpiId];
      persistPinned(next);
      return { pinnedIds: next, order: next };
    }),

  unpin: (kpiId) =>
    set((s) => {
      const next = s.pinnedIds.filter((id) => id !== kpiId);
      persistPinned(next);
      return { pinnedIds: next, order: next };
    }),

  reorder: (from, to) =>
    set((s) => {
      const next = [...s.order];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { order: next };
    }),

  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
}));
