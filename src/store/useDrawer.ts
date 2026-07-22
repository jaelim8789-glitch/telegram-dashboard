"use client";

import { create } from "zustand";

interface DrawerState { open: boolean; content: string | null; data: any; openDrawer: (content: string, data?: any) => void; closeDrawer: () => void; }

export const useDrawer = create<DrawerState>((set) => ({
  open: false, content: null, data: null,
  openDrawer: (content, data = null) => set({ open: true, content, data }),
  closeDrawer: () => set({ open: false, content: null, data: null }),
}));
