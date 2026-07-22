"use client";

import { useState, useCallback } from "react";
import { create } from "zustand";

interface FilterState { status: string[]; accountId: string | null; dateFrom: string; dateTo: string; setStatus: (s: string[]) => void; setAccount: (id: string | null) => void; setDateRange: (from: string, to: string) => void; clear: () => void; }

export const useFilterStore = create<FilterState>((set) => ({
  status: [], accountId: null, dateFrom: "", dateTo: "",
  setStatus: (s) => set({ status: s }),
  setAccount: (id) => set({ accountId: id }),
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  clear: () => set({ status: [], accountId: null, dateFrom: "", dateTo: "" }),
}));
