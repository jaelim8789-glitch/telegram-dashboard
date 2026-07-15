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
        "flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card transition-all",
        className
      )}
    >
      {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
    </button>
  );
}