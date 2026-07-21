"use client";

import { useEffect, useRef, useCallback } from "react";

const DRAFT_KEY = "telemon-draft-message";
const DRAFT_RECIPIENTS_KEY = "telemon-draft-recipients";

export function useAutoSaveDraft(message: string, recipients: string[], isActive: boolean) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !message.trim()) return;
    const t = setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, message);
        if (recipients.length > 0) localStorage.setItem(DRAFT_RECIPIENTS_KEY, JSON.stringify(recipients));
        savedRef.current = true;
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [message, recipients, isActive]);

  return {
    saved: savedRef.current,
    recover: useCallback(() => {
      try {
        const msg = localStorage.getItem(DRAFT_KEY);
        const rec = localStorage.getItem(DRAFT_RECIPIENTS_KEY);
        return { message: msg || "", recipients: rec ? JSON.parse(rec) as string[] : [] };
      } catch { return { message: "", recipients: [] as string[] }; }
    }, []),
    clear: useCallback(() => {
      try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(DRAFT_RECIPIENTS_KEY); } catch {}
    }, []),
  };
}
