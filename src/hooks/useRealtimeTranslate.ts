"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { translate } from "@/lib/ai/translate";
import { FLAG_BY_LANG, LANG_NAME } from "@/lib/ai/translation-prompt";

interface RealtimeTranslation {
  translated: string;
  detectedLang: string;
  flag: string;
  langName: string;
  loading: boolean;
}

export function useRealtimeTranslate(
  sourceText: string,
  targetLang?: string,
  debounceMs: number = 300,
): RealtimeTranslation {
  const [translated, setTranslated] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRef = useRef("");

  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslated("");
      setDetectedLang("");
      return;
    }
    if (sourceText === prevRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      prevRef.current = sourceText;
      setLoading(true);
      try {
        const result = await translate(sourceText, targetLang);
        setTranslated(result.translated);
        setDetectedLang(result.detectedLang);
      } catch {
        setTranslated("");
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sourceText, targetLang, debounceMs]);

  const flag = FLAG_BY_LANG[detectedLang] || "🌐";
  const langName = LANG_NAME[detectedLang] || detectedLang;

  return { translated, detectedLang, flag, langName, loading };
}
