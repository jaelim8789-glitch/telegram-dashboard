"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePreferredTheme } from "@/store/useThemeStore";

const themeLabels: Record<string, string> = { light: "라이트", dark: "다크", "dark-pure": "퓨어 다크" };
const themeIcons: Record<string, React.ReactNode> = { light: <Sun className="h-4 w-4" />, dark: <Moon className="h-4 w-4" />, "dark-pure": <Moon className="h-4 w-4" /> };

export function ThemeQuickToggle() {
  const { theme, setTheme, useSystemPreference, setUseSystemPreference } = usePreferredTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isDark = theme !== "light";

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.85 }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-card-hover text-app-text-muted hover:text-app-text transition-colors"
        aria-label="테마 변경"
        title="테마 변경"
      >
        <motion.div
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-app-border bg-app-card shadow-lg z-50 overflow-hidden"
          >
            {(["light", "dark", "dark-pure"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-app-card-hover ${theme === t && !useSystemPreference ? "text-app-accent bg-app-card-hover" : "text-app-text"}`}
              >
                {themeIcons[t]}
                {themeLabels[t]}
              </button>
            ))}
            <div className="border-t border-app-border" />
            <button
              onClick={() => { setUseSystemPreference(true); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-app-card-hover ${useSystemPreference ? "text-app-accent bg-app-card-hover" : "text-app-text-muted"}`}
            >
              <Monitor className="h-4 w-4" />
              시스템 설정 따르기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
