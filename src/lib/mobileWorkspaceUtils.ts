"use client";

import { create } from "zustand";

interface ScrollState { [tabId: string]: number; }
interface ScrollStore { positions: ScrollState; setPosition: (tabId: string, pos: number) => void; getPosition: (tabId: string) => number; }

export const useScrollStore = create<ScrollStore>((set, get) => ({
  positions: {},
  setPosition: (tabId, pos) => set(s => ({ positions: { ...s.positions, [tabId]: pos } })),
  getPosition: (tabId) => get().positions[tabId] || 0,
}));

const USAGE_KEY = "telemon-widget-usage";

export function recordWidgetClick(widgetId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    data[widgetId] = (data[widgetId] || 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(data));
  } catch (e) { console.warn('Unhandled error in mobileWorkspaceUtils', e) }
}

export function getTopWidgets(limit = 5): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    return Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, limit).map(e => e[0]);
  } catch { return []; }
}
