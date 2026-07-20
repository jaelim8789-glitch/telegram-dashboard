"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handler() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isFullscreen ? "전체화면 종료 (Alt+F)" : "전체화면 (Alt+F)"}
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card transition-all sm:min-h-7 sm:min-w-7",
        className
      )}
    >
      {isFullscreen ? <Minimize className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Maximize className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
    </button>
  );
}