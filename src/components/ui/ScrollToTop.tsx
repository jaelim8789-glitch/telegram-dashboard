"use client";

import { memo, useEffect, useState, useRef, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Floating "back to top" button that appears when the user scrolls down
 * past a threshold. Smooth-scrolls to the top on click.
 */
export const ScrollToTop = memo(function ScrollToTop({ threshold = 300, containerRef }: { threshold?: number; containerRef?: React.RefObject<HTMLDivElement | null> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef?.current ?? window;
    function onScroll() {
      const scrollY = containerRef?.current ? containerRef.current.scrollTop : window.scrollY;
      setVisible(scrollY > threshold);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold, containerRef]);

  function scrollToTop() {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="맨 위로"
      className={cn(
        "fixed bottom-24 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all duration-300",
        "bg-app-card border border-app-border text-app-text-muted hover:text-app-text hover:border-app-primary/50 hover:shadow-app-primary/20",
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto scale-100"
          : "translate-y-4 opacity-0 pointer-events-none scale-90"
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
});