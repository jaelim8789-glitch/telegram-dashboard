import { create } from "zustand";

export type NotificationType = "info" | "warning" | "error" | "success";

export interface NotificationAction { label: string; tabId: string; }
export interface Notification { id: string; type: NotificationType; title: string; message: string; timestamp: number; read: boolean; action?: NotificationAction; }

function generateId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  dismissNotification: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => set((state) => ({ notifications: [{ ...n, id: generateId(), timestamp: Date.now(), read: false }, ...state.notifications], unreadCount: state.unreadCount + 1 })),
  dismissNotification: (id) => set((state) => { const t = state.notifications.find(n => n.id === id); if (!t) return state; return { notifications: state.notifications.filter(n => n.id !== id), unreadCount: t.read ? state.unreadCount : state.unreadCount - 1 }; }),
  markAllRead: () => set((state) => ({ notifications: state.notifications.map(n => ({ ...n, read: true })), unreadCount: 0 })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
