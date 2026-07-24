"use client";

interface QueuedSend {
  id: string;
  accountId: string;
  message: string;
  groupIds: string[];
  imageData?: string;
  scheduledAt?: string;
  queuedAt: number;
  retries: number;
}

const DB_NAME = "telemon-offline-queue";
const STORE_NAME = "sends";
const MAX_RETRIES = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueSend(item: Omit<QueuedSend, "id" | "queuedAt" | "retries">): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.add({ ...item, id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: Date.now(), retries: 0 });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueSize(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise(resolve => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

export async function flushQueue(sendFn: (item: QueuedSend) => Promise<boolean>): Promise<{ sent: number; failed: number }> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const all: QueuedSend[] = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  let sent = 0, failed = 0;
  for (const item of all) {
    try {
      const ok = await sendFn(item);
      if (ok) { store.delete(item.id); sent++; }
      else { failed++; }
    } catch {
      if (item.retries >= MAX_RETRIES) store.delete(item.id);
      else store.put({ ...item, retries: item.retries + 1 });
      failed++;
    }
  }
  return { sent, failed };
}

export async function getQueuedItems(): Promise<QueuedSend[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise(resolve => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export function useOnlineFlush(sendFn: (item: QueuedSend) => Promise<boolean>) {
  useEffect(() => {
    function onOnline() {
      flushQueue(sendFn).then(({ sent }) => {
        if (sent > 0) {
          try {
            const toast = document.createElement("div");
            toast.className = "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-app-success px-4 py-2 text-xs font-medium text-white shadow-lg";
            toast.textContent = `${sent}개의 메시지가 ?�동 ?�송?�었?�니??;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
          } catch (e) { console.warn('Unhandled error in offlineQueue', e) }
        }
      });
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sendFn]);
}

import { useEffect } from "react";
