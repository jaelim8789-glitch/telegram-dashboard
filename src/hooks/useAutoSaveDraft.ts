"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

const DRAFT_KEY = "telemon-send-draft";
const SAVE_INTERVAL_MS = 15_000;

interface DraftData {
  message: string;
  selectedGroupIds: string[];
  replyToMessageId: number | null;
  savedAt: number;
}

export function useAutoSaveDraft() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = useCallback(() => {
    const state = useDashboardStore.getState();
    if (!state.sendMessage && state.sendSelectedGroupIds.length === 0) return;
    const draft: DraftData = {
      message: state.sendMessage,
      selectedGroupIds: state.sendSelectedGroupIds,
      replyToMessageId: state.sendReplyToMessageId,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(save, SAVE_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [save]);

  const restore = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw) as DraftData;
      const age = Date.now() - draft.savedAt;
      if (age > 86400000) {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  return { save, restore, clearDraft };
}

export function useDraftRestore() {
  const restore = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftData;
      const age = Date.now() - draft.savedAt;
      if (age > 86400000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const store = useDashboardStore.getState();
      if (!store.sendMessage && draft.message) {
        store.setSendMessage(draft.message);
      }
      if (store.sendSelectedGroupIds.length === 0 && draft.selectedGroupIds.length > 0) {
        store.setSendSelectedGroupIds(draft.selectedGroupIds);
      }
    } catch {}
  }, []);

  useEffect(() => { restore(); }, [restore]);
}
