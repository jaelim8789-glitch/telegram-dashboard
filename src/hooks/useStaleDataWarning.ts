"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToastStore } from "@/components/ui/GlobalToast";

export function useStaleDataWarning(key: string, maxAgeMs = 600000) {
  const [stale, setStale] = useState(false);
  const toast = useToastStore(s => s.add);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > maxAgeMs) {
        setStale(true);
        toast({ type: "warning", title: "?°ì´?°ê? ?¤ëž˜?˜ì—ˆ?µë‹ˆ??, message: "?ˆë¡œê³ ì¹¨??ê¶Œìž¥?©ë‹ˆ?? });
      }
    } catch (e) { console.warn('Unhandled error in useStaleDataWarning', e) }
  }, [key, maxAgeMs, toast]);

  return { stale, dismiss: () => setStale(false) };
}
