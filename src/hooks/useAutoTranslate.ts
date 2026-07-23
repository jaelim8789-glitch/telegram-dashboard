"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { translate } from "@/lib/ai/translate";

interface AutoTranslateResult {
  translated: string;
  detectedLang: string;
  loading: boolean;
  showOriginal: boolean;
  toggleOriginal: () => void;
}

const autoCache = new Map<string, string>();

export function useAutoTranslate(
  sourceText: string,
  targetLang?: string,
): AutoTranslateResult {
  const [translated, setTranslated] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const prevRef = useRef("");

  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslated("");
      setDetectedLang("");
      return;
    }
    if (sourceText === prevRef.current) return;
    prevRef.current = sourceText;

    const cacheKey = `${targetLang ?? "ko"}::${sourceText}`;
    const cached = autoCache.get(cacheKey);
    if (cached) {
      setTranslated(cached);
      setDetectedLang("cached");
      return;
    }

    let cancelled = false;
    setLoading(true);
    translate(sourceText, targetLang).then((result) => {
      if (cancelled) return;
      autoCache.set(cacheKey, result.translated);
      setTranslated(result.translated);
      setDetectedLang(result.detectedLang);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sourceText, targetLang]);

  const toggleOriginal = useCallback(() => {
    setShowOriginal((p) => !p);
  }, []);

  return { translated, detectedLang, loading, showOriginal, toggleOriginal };
}
