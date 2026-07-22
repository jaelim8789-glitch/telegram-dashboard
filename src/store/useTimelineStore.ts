import { create } from "zustand";
import type { Broadcast } from "@/types";
import * as api from "@/lib/api";

export type TimelineEventType = "broadcast_sent" | "broadcast_failed" | "broadcast_cancelled" | "account_registered" | "account_banned" | "account_health_issue" | "recurring_created" | "recurring_error" | "recurring_paused" | "system_notification";

export interface TimelineEvent {
  id: string; type: TimelineEventType; title: string; description: string; timestamp: string;
  status: "success" | "danger" | "warning" | "info" | "neutral"; icon: string;
}

interface TimelineState { events: TimelineEvent[]; loading: boolean; fetchEvents: () => Promise<void>; addEvent: (event: TimelineEvent) => void; }

function toStatus(type: TimelineEventType): TimelineEvent["status"] {
  switch (type) {
    case "broadcast_sent": case "account_registered": case "recurring_created": return "success";
    case "broadcast_failed": case "account_banned": case "recurring_error": return "danger";
    case "account_health_issue": case "recurring_paused": return "warning";
    case "broadcast_cancelled": return "neutral";
    default: return "info";
  }
}

function toIcon(type: TimelineEventType): string {
  switch (type) {
    case "broadcast_sent": return "CheckCircle2"; case "broadcast_failed": return "XCircle"; case "broadcast_cancelled": return "Ban";
    case "account_registered": return "UserPlus"; case "account_banned": return "ShieldOff"; case "account_health_issue": return "AlertTriangle";
    case "recurring_created": return "RefreshCw"; case "recurring_error": return "AlertCircle"; case "recurring_paused": return "PauseCircle";
    default: return "Bell";
  }
}

export function broadcastToTimelineEvent(b: Broadcast, accountLabel: string): TimelineEvent {
  const msg = b.message.length > 60 ? b.message.slice(0, 60) + "…" : b.message;
  let type: TimelineEventType, title: string;
  if (b.status === "sent") { type = "broadcast_sent"; title = "발송 완료"; } else if (b.status === "failed") { type = "broadcast_failed"; title = "발송 실패"; } else if (b.status === "cancelled") { type = "broadcast_cancelled"; title = "발송 취소"; } else { type = "broadcast_sent"; title = `발송 ${b.status}`; }
  return { id: `broadcast:${b.id}`, type, title, description: `${msg} · ${accountLabel}`, timestamp: b.sentAt || b.createdAt, status: toStatus(type), icon: toIcon(type) };
}

export const useTimelineStore = create<TimelineState>((set) => ({
  events: [], loading: false,
  fetchEvents: async () => {
    set({ loading: true });
    try {
      const [logsResult] = await Promise.allSettled([api.fetchLogs()]);
      const events: TimelineEvent[] = [];
      if (logsResult.status === "fulfilled") {
        const accounts = await api.fetchAccounts().catch(() => []);
        for (const b of logsResult.value) {
          const acct = accounts.find((a: { id: string }) => a.id === b.accountId);
          const accLabel = acct?.name?.trim() || acct?.phone || b.accountId.slice(0, 8);
          events.push(broadcastToTimelineEvent(b, accLabel));
        }
      }
      events.sort((a, b) => new Date(b.timestamp + "Z").getTime() - new Date(a.timestamp + "Z").getTime());
      set({ events: events.slice(0, 50), loading: false });
    } catch { set({ loading: false }); }
  },
  addEvent: (event) => set((state) => ({ events: [event, ...state.events].slice(0, 50) })),
}));
