"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useReachability() {
  const [reachable, setReachable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setReachable(false);
    document.documentElement.removeAttribute("data-reachability");
  }, []);

  const toggle = useCallback(() => {
    setReachable((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute("data-reachability", "true");
      } else {
        document.documentElement.removeAttribute("data-reachability");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let lastTap = 0;
    let tapCount = 0;

    function handleTap(e: TouchEvent) {
      const touch = e.touches[0];
      const bottomZone = window.innerHeight - 60;

      if (touch.clientY < bottomZone) {
        if (reachable) {
          dismiss();
        }
        return;
      }

      const now = Date.now();
      if (now - lastTap < 400) {
        tapCount++;
      } else {
        tapCount = 1;
      }
      lastTap = now;

      if (tapCount >= 2) {
        toggle();
        tapCount = 0;
      }
    }

    function handleOutsideTap(e: TouchEvent) {
      if (!reachable) return;
      const touch = e.touches[0];
      const bottomZone = window.innerHeight - 60;
      if (touch.clientY < bottomZone) {
        dismiss();
      }
    }

    function handleScroll() {
      if (reachable) dismiss();
    }

    document.addEventListener("touchstart", handleTap, { passive: true });
    document.addEventListener("touchstart", handleOutsideTap, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTap);
      document.removeEventListener("touchstart", handleOutsideTap);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [reachable, dismiss, toggle]);

  useEffect(() => {
    if (!reachable) return;
    timerRef.current = setTimeout(dismiss, 5000);
    return () => clearTimeout(timerRef.current);
  }, [reachable, dismiss]);

  return { reachable, toggle, dismiss };
}
