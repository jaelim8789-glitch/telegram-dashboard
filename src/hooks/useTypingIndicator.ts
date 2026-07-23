"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useTypingIndicator(onTyping?: () => void) {
  const [isTyping, setIsTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleType = useCallback(() => {
    setIsTyping(true);
    onTyping?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIsTyping(false), 1500);
  }, [onTyping]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { isTyping, handleType };
}
