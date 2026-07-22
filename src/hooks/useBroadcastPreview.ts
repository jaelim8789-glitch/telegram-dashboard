"use client";

import { useState, useCallback, useRef } from "react";

export function useBroadcastPreview() {
  const [preview, setPreview] = useState<{ message: string; accountName: string; recipients: number } | null>(null);
  const generatePreview = useCallback((message: string, accountName: string, recipients: number) => {
    setPreview({ message: message.slice(0, 200), accountName, recipients });
  }, []);
  return { preview, generatePreview, clearPreview: () => setPreview(null) };
}
