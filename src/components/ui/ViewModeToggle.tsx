"use client";

import { create } from "zustand";

type ViewMode = "card" | "list" | "compact";

interface ViewModeState { viewModes: Record<string, ViewMode>; setViewMode: (key: string, mode: ViewMode) => void; getViewMode: (key: string) => ViewMode; }

export const useViewModeStore = create<ViewModeState>((set, get) => ({
  viewModes: {},
  setViewMode: (key, mode) => { try { localStorage.setItem(`viewmode-${key}`, mode); } catch (e) { console.warn('Unhandled error in ViewModeToggle', e) } set(s => ({ viewModes: { ...s.viewModes, [key]: mode } })); },
  getViewMode: (key) => get().viewModes[key] || "card",
}));

export function ViewModeToggle({ viewKey, className }: { viewKey: string; className?: string }) {
  const current = useViewModeStore(s => s.getViewMode(viewKey));
  const setViewMode = useViewModeStore(s => s.setViewMode);
  const modes: { id: ViewMode; icon: string }[] = [
    { id: "card", icon: "?? },
    { id: "list", icon: "?? },
    { id: "compact", icon: "?? },
  ];
  return (
    <div className={`flex items-center gap-0.5 rounded-lg border border-app-border p-0.5 ${className || ""}`}>
      {modes.map(m => (
        <button key={m.id} onClick={() => setViewMode(viewKey, m.id)}
          className={`flex h-6 w-6 items-center justify-center rounded text-[11px] transition-colors ${current === m.id ? "bg-app-primary text-white" : "text-app-text-muted hover:text-app-text"}`}>
          {m.icon}
        </button>
      ))}
    </div>
  );
}
