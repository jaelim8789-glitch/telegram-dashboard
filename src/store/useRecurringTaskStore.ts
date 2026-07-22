"use client";

import { create } from "zustand";

type RepeatInterval = "none" | "daily" | "weekly" | "monthly";

export interface RecurringTask {
  id: string; accountId: string; message: string; interval: RepeatInterval;
  time: string; dayOfWeek?: number; dayOfMonth?: number; active: boolean; lastSent?: string;
}

interface RecurringStore { tasks: RecurringTask[]; add: (t: RecurringTask) => void; remove: (id: string) => void; toggle: (id: string) => void; }

export const useRecurringStore = create<RecurringStore>((set) => ({
  tasks: [],
  add: (t) => set(s => ({ tasks: [...s.tasks, t] })),
  remove: (id) => set(s => ({ tasks: s.tasks.filter(x => x.id !== id) })),
  toggle: (id) => set(s => ({ tasks: s.tasks.map(x => x.id === id ? { ...x, active: !x.active } : x) })),
}));
