"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
}

const QUEUE_KEY = "telemon-offline-queue";

export function OfflineActionQueue({ children }: { children: ReactNode }) {
  const processingRef = useRef(false);

  function getQueue(): QueuedAction[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch { return []; }
  }

  async function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    const queue = getQueue();
    if (queue.length === 0) { processingRef.current = false; return; }

    const remaining: QueuedAction[] = [];
    for (const action of queue) {
      try {
        const res = await fetch("/api/offline-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        if (!res.ok) remaining.push(action);
      } catch {
        remaining.push(action);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    processingRef.current = false;
  }

  useEffect(() => {
    const handleOnline = () => processQueue();
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) processQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return <>{children}</>;
}

export function useOfflineQueue() {
  function enqueue(type: string, payload: unknown) {
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      queue.push({ id: crypto.randomUUID(), type, payload, createdAt: Date.now() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) { console.warn('Unhandled error in OfflineActionQueue', e) }
  }
  return { enqueue, queueSize: (JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as QueuedAction[]).length };
}
