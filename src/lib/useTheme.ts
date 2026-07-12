"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "telemon-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "light";
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      if (getTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme, cycleTheme, resolvedTheme };
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "light";
}

export function getResolvedTheme(): "light" | "dark" {
  const t = getTheme();
  return t === "system" ? getSystemTheme() : t;
}