"use client";

import { useState, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SnoozeItem { id: string; until: number; }
interface SnoozeStore { items: SnoozeItem[]; snooze: (id: string, minutes: number) => void; unsnooze: (id: string) => void; isSnoozed: (id: string) => boolean; }

export const useSnoozeStore = create<SnoozeStore>()(persist(
  (set, get) => ({
    items: [],
    snooze: (id, minutes) => set(s => ({ items: [...s.items.filter(x => x.id !== id), { id, until: Date.now() + minutes * 60000 }] })),
    unsnooze: (id) => set(s => ({ items: s.items.filter(x => x.id !== id) })),
    isSnoozed: (id) => { const item = get().items.find(x => x.id === id); return !!item && item.until > Date.now(); },
  }),
  { name: "teleminiapp-snooze" }
));
