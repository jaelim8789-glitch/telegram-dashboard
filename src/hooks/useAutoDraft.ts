"use client";

import { useRef, useCallback } from "react";
import { create } from "zustand";

interface Draft { key: string; value: string; savedAt: number; }
interface DraftStore { drafts: Draft[]; save: (key: string, value: string) => void; load: (key: string) => string | null; clear: (key: string) => void; }

const DRAFT_KEY = "telemon-drafts";

export const useDraftStore = create<DraftStore>((set, get) => ({
  drafts: (() => { try { return JSON.parse(typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) || "[]" : "[]"); } catch { return []; } })(),
  save: (key, value) => set(s => {
    const next = [{ key, value, savedAt: Date.now() }, ...s.drafts.filter(d => d.key !== key)].slice(0, 20);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch (e) { console.warn('Unhandled error in useAutoDraft', e) }
    return { drafts: next };
  }),
  load: (key) => { const d = get().drafts.find(x => x.key === key); return d ? d.value : null; },
  clear: (key) => set(s => { const next = s.drafts.filter(d => d.key !== key); try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch (e) { console.warn('Unhandled error in useAutoDraft', e) } return { drafts: next }; }),
}));

export function useAutoDraft(key: string) {
  const save = useDraftStore(s => s.save);
  const load = useDraftStore(s => s.load);
  const clear = useDraftStore(s => s.clear);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const onChange = useCallback((v: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(key, v), 500);
  }, [key, save]);

  const restore = useCallback(() => load(key), [key, load]);

  return { onChange, restore, clearDraft: () => clear(key) };
}
