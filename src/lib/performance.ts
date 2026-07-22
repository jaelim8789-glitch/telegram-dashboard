import { useRef, useCallback, useEffect, type DependencyList } from "react";

export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return useCallback((...args: any[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]) as T;
}

export function useThrottle<T extends (...args: any[]) => void>(fn: T, limit: number): T {
  const inThrottle = useRef(false);
  return useCallback((...args: any[]) => {
    if (!inThrottle.current) {
      fn(...args);
      inThrottle.current = true;
      setTimeout(() => { inThrottle.current = false; }, limit);
    }
  }, [fn, limit]) as T;
}

export function usePollingInterval(hasActiveJob: boolean): number {
  return hasActiveJob ? 3000 : 60000;
}

export function usePasteImage(onPaste: (file: File) => void) {
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const item = e.clipboardData?.items?.[0];
      if (!item || !item.type.startsWith("image/")) return;
      e.preventDefault();
      const file = item.getAsFile();
      if (file) onPaste(file);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [onPaste]);
}
