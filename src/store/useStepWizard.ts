"use client";

import { create } from "zustand";

interface Step { id: string; label: string; status: "pending" | "active" | "done" | "error"; }

interface WizardState { steps: Step[]; current: number; setCurrent: (i: number) => void; next: () => void; prev: () => void; markDone: (id: string) => void; markError: (id: string) => void; reset: () => void; }

export function createWizardStore(initialSteps: Step[]) {
  return create<WizardState>((set, get) => ({
    steps: initialSteps,
    current: 0,
    setCurrent: (i) => set(s => ({ steps: s.steps.map((st, idx) => ({ ...st, status: idx === i ? "active" as const : st.status })), current: i })),
    next: () => { const cur = get().current; if (cur < get().steps.length - 1) { get().markDone(get().steps[cur].id); set({ current: cur + 1 }); }},
    prev: () => { const cur = get().current; if (cur > 0) set({ current: cur - 1 }); },
    markDone: (id) => set(s => ({ steps: s.steps.map(st => st.id === id ? { ...st, status: "done" } : st) })),
    markError: (id) => set(s => ({ steps: s.steps.map(st => st.id === id ? { ...st, status: "error" } : st) })),
    reset: () => set({ steps: initialSteps.map(s => ({ ...s, status: "pending" })), current: 0 }),
  }));
}
