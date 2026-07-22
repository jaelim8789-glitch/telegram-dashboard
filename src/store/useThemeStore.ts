"use client";

import { useCallback } from "react";
import { create } from "zustand";

type Theme = "light" | "dark" | "dark-pure";
interface ThemeStore { theme: Theme; setTheme: (t: Theme) => void; cycle: () => void; }

const KEY = "telemon-theme";

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: (() => { if (typeof window === "undefined") return "dark"; try { return (localStorage.getItem(KEY) as Theme) || "dark"; } catch { return "dark"; } })(),
  setTheme: (t) => { set({ theme: t }); document.documentElement.setAttribute("data-theme", t); try { localStorage.setItem(KEY, t); } catch {} },
  cycle: () => { const order: Theme[] = ["light", "dark", "dark-pure"]; const cur = get().theme; const next = order[(order.indexOf(cur) + 1) % order.length]; get().setTheme(next); },
}));
