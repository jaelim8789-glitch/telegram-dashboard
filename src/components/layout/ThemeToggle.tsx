"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycleTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch: render a placeholder until client side mounts
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center rounded-md text-app-text-muted sm:min-h-7 sm:min-w-7",
          className
        )}
        aria-label="테마 변경"
      >
        <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </button>
    );
  }

  const icons = {
    dark: <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
    light: <Sun className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
    system: <Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card transition-all sm:min-h-7 sm:min-w-7",
        className
      )}
      title={`테마: ${theme === "dark" ? "다크" : theme === "light" ? "라이트" : "시스템"} (${resolvedTheme === "dark" ? "🌙" : "☀️"})`}
      aria-label="테마 변경"
    >
      {icons[theme]}
    </button>
  );
}