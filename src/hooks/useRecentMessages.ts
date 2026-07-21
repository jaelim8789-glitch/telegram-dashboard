"use client";

import { useState, useCallback } from "react";

/**
 * Recent sent messages store (10)
 */
const KEY = "telemon-recent-messages";

export function useRecentMessages() {
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  });

  const addRecent = useCallback((msg: string) => {
    if (!msg.trim()) return;
    const updated = [msg, ...recent.filter((m) => m !== msg)].slice(0, 5);
    setRecent(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  }, [recent]);

  return { recent, addRecent };
}
