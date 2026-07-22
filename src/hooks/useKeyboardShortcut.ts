"use client";

import { useRef, useCallback, useEffect } from "react";

export function useKeyboardShortcut(key: string, callback: () => void, options: { ctrl?: boolean; shift?: boolean; enabled?: boolean } = {}) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (options.enabled === false) return;
    function handler(e: KeyboardEvent) {
      const ctrl = options.ctrl !== undefined ? e.ctrlKey || e.metaKey : true;
      const shift = options.shift !== undefined ? e.shiftKey : true;
      if (ctrl && shift && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        cbRef.current();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, options.ctrl, options.shift, options.enabled]);
}

export function KeyboardShortcutHint({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center justify-center min-w-[20px] h-5 rounded border border-app-border bg-app-card-hover px-1 text-[10px] font-mono text-app-text-muted">
          {k}
        </span>
      ))}
    </div>
  );
}
