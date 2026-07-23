"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "telemon-app-font-scale";

export function useAppFontScale() {
  const [scale, setScaleState] = useState(() => {
    if (typeof window === "undefined") return 1;
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "1"); } catch { return 1; }
  });

  const setScale = useCallback((s: number) => {
    const clamped = Math.max(0.8, Math.min(1.3, s));
    setScaleState(clamped);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped)); } catch {}
    document.documentElement.style.setProperty("--app-font-scale", String(clamped));
  }, []);

  return { scale, setScale, increase: () => setScale(scale + 0.1), decrease: () => setScale(scale - 0.1) };
}

export function FontSizeControl() {
  const [scale, setScale] = useState(() => {
    if (typeof window === "undefined") return 1;
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "1"); } catch { return 1; }
  });

  function change(delta: number) {
    const next = Math.max(0.8, Math.min(1.3, scale + delta));
    setScale(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    document.documentElement.style.setProperty("--app-font-scale", String(next));
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => change(-0.1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border text-sm text-app-text-muted hover:text-app-text active:scale-90">A-</button>
      <span className="text-xs text-app-text-muted w-8 text-center">{Math.round(scale * 100)}%</span>
      <button onClick={() => change(0.1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border text-lg text-app-text-muted hover:text-app-text active:scale-90">A+</button>
    </div>
  );
}
