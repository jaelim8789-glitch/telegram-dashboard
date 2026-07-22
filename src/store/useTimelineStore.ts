"use client";

import { create } from "zustand";
import * as api from "@/lib/api";

export interface TimelineEvent {
  id: string;
  type: "broadcast" | "health" | "system" | "account";
  title: string;
  description: string;
  timestamp: string;
  severity?: "info" | "warning" | "error";
}

interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (e: Omit<TimelineEvent, "id">) => void;
}

export function broadcastToTimelineEvent(b: api.Broadcast): TimelineEvent {
  return {
    id: `b-${b.id}`,
    type: "broadcast",
    title: b.status === "failed" ? "발송 실패" : "발송 완료",
    description: b.message.slice(0, 80),
    timestamp: b.sentAt ?? b.createdAt,
    severity: b.status === "failed" ? "error" : "info",
  };
}

export function healthToTimelineEvent(h: api.AccountHealthItem): TimelineEvent {
  const sev: TimelineEvent["severity"] =
    h.status === "healthy" ? "info" : h.status === "error" || h.status === "banned" ? "error" : "warning";
  return {
    id: `h-${h.accountId}-${Date.now()}`,
    type: "health",
    title: `계정 상태: ${h.status}`,
    description: h.lastError ?? `${h.phone} 상태 변경`,
    timestamp: h.lastActivity ?? new Date().toISOString(),
    severity: sev,
  };
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  loading: false,

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const [logs, health] = await Promise.all([
        api.fetchLogs({ days: 1 }),
        api.fetchAccountHealth(),
      ]);
      const broadcastEvents = logs.map(broadcastToTimelineEvent);
      const healthEvents = health.map(healthToTimelineEvent);
      const all = [...broadcastEvents, ...healthEvents].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      set({ events: all.slice(0, 50), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addEvent: (e) => {
    const event: TimelineEvent = { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
    set((s) => ({ events: [event, ...s.events].slice(0, 50) }));
  },
}));
