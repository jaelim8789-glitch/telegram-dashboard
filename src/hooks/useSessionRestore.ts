"use client";

import { useRef, useCallback } from "react";
import { create } from "zustand";

interface SessionState { tabId: string | null; navView: string | null; setSession: (tab: string, view: string) => void; clear: () => void; }

export const useSessionStateStore = create<SessionState>((set) => ({
  tabId: null, navView: null,
  setSession: (tab, view) => set({ tabId: tab, navView: view }),
  clear: () => set({ tabId: null, navView: null }),
}));

export function useSessionRestore() {
  const setSession = useSessionStateStore(s => s.setSession);

  const save = useCallback((tab: string, view: string) => {
    setSession(tab, view);
    try { sessionStorage.setItem("telemon-session", JSON.stringify({ tab, view })); } catch {}
  }, [setSession]);

  const restore = useCallback(() => {
    try { const raw = sessionStorage.getItem("telemon-session"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);

  return { save, restore };
}
