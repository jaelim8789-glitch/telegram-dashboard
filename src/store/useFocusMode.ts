"use client";

import { useCallback, useRef, useState } from "react";
import { create } from "zustand";

interface FocusModeState { enabled: boolean; hidden: string[]; toggle: (id: string) => void; enable: () => void; disable: () => void; }

export const useFocusMode = create<FocusModeState>((set) => ({
  enabled: false, hidden: [],
  toggle: (id) => set(s => ({ hidden: s.hidden.includes(id) ? s.hidden.filter(x => x !== id) : [...s.hidden, id] })),
  enable: () => set({ enabled: true }),
  disable: () => set({ enabled: false, hidden: [] }),
}));
