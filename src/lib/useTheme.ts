"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "dark-pure" | "system";

const STORAGE_KEY = "telemon-theme";

/** Inline bootstrap script rendered in the root layout's <head> (see
 * src/app/layout.tsx). Runs synchronously before first paint so data-theme
 * is already correct by the time CSS applies — without it, every page loads
 * in the light-mode default and then visibly flips once this module's
 * useEffect runs post-hydration. Must mirror getTheme()/getSystemTheme()/
 * applyTheme() above exactly (default "light" when unset, "system" resolves
 * via prefers-color-scheme: light) since it can't import this file — no JS
 * bundle has loaded yet when it runs. */
export const THEME_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem("${STORAGE_KEY}");var m=(v==="light"||v==="dark"||v==="dark-pure"||v==="system")?v:"system";var r=m==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):m;var el=document.documentElement;el.setAttribute("data-theme",r);el.classList.add(r);}catch(e){}})();`;

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme, animate = false) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const el = document.documentElement;

  if (animate && el.getAttribute("data-theme") !== resolved) {
    el.classList.add("theme-transitioning");
    setTimeout(() => {
      el.classList.remove("theme-transitioning");
    }, 500);
  }

  el.setAttribute("data-theme", resolved);
  el.classList.remove("light", "dark", "dark-pure");
  el.classList.add(resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? "system";
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t, true);
  }, []);

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["light", "dark", "dark-pure", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme === "dark-pure" ? "dark" : theme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme, cycleTheme, resolvedTheme };
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
}

export function getResolvedTheme(): "light" | "dark" {
  const t = getTheme();
  return t === "system" ? getSystemTheme() : (t === "dark-pure" ? "dark" : t);
}