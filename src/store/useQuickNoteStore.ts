"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QuickNote { id: string; content: string; createdAt: number; color?: string; }

interface NoteStore { notes: QuickNote[]; add: (content: string) => void; remove: (id: string) => void; update: (id: string, content: string) => void; }

export const useQuickNoteStore = create<NoteStore>()(persist(
  (set) => ({
    notes: [],
    add: (content) => set(s => ({ notes: [{ id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, content, createdAt: Date.now() }, ...s.notes] })),
    remove: (id) => set(s => ({ notes: s.notes.filter(x => x.id !== id) })),
    update: (id, content) => set(s => ({ notes: s.notes.map(x => x.id === id ? { ...x, content } : x) })),
  }),
  { name: "telemon-quick-notes" }
));
