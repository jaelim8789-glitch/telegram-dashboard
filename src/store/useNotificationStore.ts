"use client";

import { create } from "zustand";

export interface AppNotification {
  id: string;
  type: "broadcast" | "error" | "account" | "system" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: { label: string; onClick: () => void };
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  dismissNotification: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "telemon-notifications";

function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

function saveNotifications(ns: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ns));
  } catch {}
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: loadNotifications(),
  unreadCount: loadNotifications().filter((n) => !n.read).length,

  addNotification: (n) => {
    const notification: AppNotification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const next = [notification, ...get().notifications].slice(0, 100);
    saveNotifications(next);
    set({ notifications: next, unreadCount: next.filter((x) => !x.read).length });
  },

  dismissNotification: (id) => {
    const next = get().notifications.filter((n) => n.id !== id);
    saveNotifications(next);
    set({ notifications: next, unreadCount: next.filter((n) => !n.read).length });
  },

  markAllRead: () => {
    const next = get().notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(next);
    set({ notifications: next, unreadCount: 0 });
  },

  clearAll: () => {
    saveNotifications([]);
    set({ notifications: [], unreadCount: 0 });
  },
}));
