"use client";

import { useCallback } from "react";
import { create } from "zustand";

type Theme = "light" | "dark" | "dark-pure";
interface ThemeStore { theme: Theme; setTheme: (t: Theme) => void; cycle: () => void; useSystemPreference: boolean; setUseSystemPreference: (v: boolean) => void; }

const KEY = "telemon-theme";
const SYSTEM_PREF_KEY = "telemon-theme-use-system";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch { return "dark"; }
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return (localStorage.getItem(KEY) as Theme) || "dark";
  } catch { return "dark"; }
}

function getUseSystemPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SYSTEM_PREF_KEY) === "true";
  } catch { return false; }
}

function resolveInitialTheme(): Theme {
  if (getUseSystemPref()) {
    return getSystemTheme();
  }
  const stored = getStoredTheme();
  if (!stored || stored === "dark") {
    const sys = getSystemTheme();
    return sys;
  }
  return stored;
}

function applyTheme(t: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", t);
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: resolveInitialTheme(),
  useSystemPreference: getUseSystemPref(),
  setTheme: (t) => {
    set({ theme: t, useSystemPreference: false });
    applyTheme(t);
    try { localStorage.setItem(KEY, t); } catch (e) { console.warn('Unhandled error in useThemeStore', e) }
    try { localStorage.setItem(SYSTEM_PREF_KEY, "false"); } catch (e) { console.warn('Unhandled error in useThemeStore', e) }
  },
  setUseSystemPreference: (v) => {
    set({ useSystemPreference: v });
    try { localStorage.setItem(SYSTEM_PREF_KEY, String(v)); } catch (e) { console.warn('Unhandled error in useThemeStore', e) }
    if (v) {
      const sys = getSystemTheme();
      set({ theme: sys });
      applyTheme(sys);
    }
  },
  cycle: () => { const order: Theme[] = ["light", "dark", "dark-pure"]; const cur = get().theme; const next = order[(order.indexOf(cur) + 1) % order.length]; get().setTheme(next); },
}));

if (typeof window !== "undefined") {
  applyTheme(useThemeStore.getState().theme);

  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (useThemeStore.getState().useSystemPreference) {
        const next = e.matches ? "dark" : "light";
        useThemeStore.setState({ theme: next });
        applyTheme(next);
      }
    });
  } catch (e) { console.warn('Unhandled error in useThemeStore', e) }
}

export function usePreferredTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const cycle = useThemeStore((s) => s.cycle);
  const useSystemPreference = useThemeStore((s) => s.useSystemPreference);
  const setUseSystemPreference = useThemeStore((s) => s.setUseSystemPreference);
  return { theme, setTheme, cycle, useSystemPreference, setUseSystemPreference };
}
