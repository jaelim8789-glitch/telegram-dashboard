"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppWidget { id: string; type: "stat" | "chart" | "list" | "progress"; order: number; visible: boolean; }
interface WidgetStore { widgets: AppWidget[]; reorder: (ids: string[]) => void; toggle: (id: string) => void; }

export const useWidgetStore = create<WidgetStore>()(persist(
  (set) => ({ widgets: [], reorder: (ids) => set(s => ({ widgets: ids.map((id, i) => ({ ...s.widgets.find(w => w.id === id)!, order: i })) })), toggle: (id) => set(s => ({ widgets: s.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w) })) }),
  { name: "teleminiapp-widgets" }
));
