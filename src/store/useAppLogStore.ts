"use client";

import { useToastStore } from "@/components/ui/GlobalToast";
import { create } from "zustand";

type LogLevel = "info" | "warn" | "error";

interface AppLog { id: string; level: LogLevel; message: string; timestamp: number; source?: string; }
interface AppLogStore { logs: AppLog[]; add: (level: LogLevel, message: string, source?: string) => void; clear: () => void; }

export const useAppLogStore = create<AppLogStore>((set) => ({
  logs: [],
  add: (level, message, source) => set(s => ({ logs: [{ id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, level, message, timestamp: Date.now(), source }, ...s.logs].slice(0, 100) })),
  clear: () => set({ logs: [] }),
}));

export function useLogger(source: string) {
  const add = useAppLogStore(s => s.add);
  return {
    info: (msg: string) => add("info", msg, source),
    warn: (msg: string) => add("warn", msg, source),
    error: (msg: string) => add("error", msg, source),
  };
}
