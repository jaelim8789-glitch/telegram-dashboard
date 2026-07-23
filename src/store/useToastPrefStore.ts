"use client";

import { create } from "zustand";

type ToastPosition = "top" | "bottom";
interface ToastPrefState { position: ToastPosition; duration: number; setPosition: (p: ToastPosition) => void; setDuration: (d: number) => void; }

export const useToastPrefStore = create<ToastPrefState>((set) => ({
  position: "top", duration: 4000,
  setPosition: (p) => set({ position: p }),
  setDuration: (d) => set({ duration: d }),
}));
