"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Label { id: string; name: string; color: string; }
interface LabelStore { labels: Label[]; add: (name: string, color: string) => void; remove: (id: string) => void; getAssignments: (targetId: string) => string[]; toggleAssignment: (targetId: string, labelId: string) => void; }

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export const useLabelStore = create<LabelStore>()(persist(
  (set, get) => ({
    labels: [],
    add: (name, color) => set(s => ({ labels: [...s.labels, { id: `label-${Date.now()}`, name, color }] })),
    remove: (id) => set(s => ({ labels: s.labels.filter(x => x.id !== id) })),
    getAssignments: (targetId) => { try { return JSON.parse(localStorage.getItem(`labels-${targetId}`) || "[]"); } catch { return []; }},
    toggleAssignment: (targetId, labelId) => {
      const current = get().getAssignments(targetId);
      const next = current.includes(labelId) ? current.filter((x: string) => x !== labelId) : [...current, labelId];
      try { localStorage.setItem(`labels-${targetId}`, JSON.stringify(next)); } catch {}
    },
  }),
  { name: "telemon-labels" }
));
