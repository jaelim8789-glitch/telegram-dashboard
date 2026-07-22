"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeQuickToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    setDark(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem("telemon-theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <motion.button onClick={toggle} whileTap={{ scale: 0.85 }} className="flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-card-hover text-app-text-muted hover:text-app-text transition-colors" aria-label={dark ? "라이트 모드" : "다크 모드"}>
      <motion.div key={dark ? "moon" : "sun"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
        {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </motion.div>
    </motion.button>
  );
}
