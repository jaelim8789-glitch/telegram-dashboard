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

  const icons: Record<string, React.ReactNode> = {
    dark: <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
    "dark-pure": <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
    light: <Sun className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
    system: <Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" />,
  };

  const themeLabel: Record<string, string> = {
    dark: "다크",
    "dark-pure": "OLED 다크",
    light: "라이트",
    system: "시스템",
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card transition-all sm:min-h-7 sm:min-w-7",
        className
      )}
      title={`테마: ${themeLabel[theme] ?? theme}`}
      aria-label="테마 변경"
    >
      {theme === "dark-pure" ? (
        <span className="relative">
          <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 text-[6px] leading-none">●</span>
        </span>
      ) : (
        icons[theme]
      )}
    </button>
  );
}