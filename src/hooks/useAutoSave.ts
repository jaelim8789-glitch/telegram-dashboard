"use client";

import { useRef, useEffect } from "react";

export function useAutoSave(key: string, value: string) {
  const saved = useRef(false);

  useEffect(() => {
    if (!saved.current) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() })); } catch (e) { console.warn('Unhandled error in useAutoSave', e) }
    }, 500);
    return () => clearTimeout(timer);
  }, [key, value]);

  useEffect(() => { saved.current = true; }, []);

  function loadSaved(): string {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      return parsed.value || "";
    } catch { return ""; }
  }

  function clearSaved() { try { localStorage.removeItem(key); } catch (e) { console.warn('Unhandled error in useAutoSave', e) } }

  return { loadSaved, clearSaved };
}
