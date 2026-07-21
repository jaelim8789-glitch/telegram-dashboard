"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Clipboard detection — 사용자가 외부에서 텍스트를 복사했는지 감지
 */
export function useClipboardDetect(enabled = false) {
  const [clipboardText, setClipboardText] = useState("");
  const lastPaste = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    function onPaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("text");
      if (text && text.length > 10 && Date.now() - lastPaste.current > 5000) {
        setClipboardText(text);
        lastPaste.current = Date.now();
        // Auto-clear after 30s
        setTimeout(() => setClipboardText(""), 30000);
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enabled]);

  return clipboardText;
}
