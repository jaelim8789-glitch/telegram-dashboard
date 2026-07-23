"use client";

import { useCallback, useState } from "react";

export function useClipboard() {
  const [copied, setCopied] = useState("");
  const copy = useCallback(async (text: string, label?: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label || text); setTimeout(() => setCopied(""), 2000); return true; } catch { return false; }
  }, []);
  return { copy, copied };
}
