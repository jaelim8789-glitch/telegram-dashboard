"use client";

import { useCallback, useSyncExternalStore } from "react";
import ko from "@/messages/ko.json";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import zh from "@/messages/zh.json";

type Locale = "ko" | "en" | "ja" | "zh";
type Messages = Record<string, unknown>;

const STORAGE_KEY = "telemon-locale";

const MESSAGES: Record<Locale, Messages> = { ko, en, ja, zh };

// Read stored locale immediately at module load time
let currentLocale: Locale = "ko";
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ko" || stored === "en" || stored === "ja" || stored === "zh") {
    currentLocale = stored;
  }
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Locale {
  return currentLocale;
}

function getNested(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  listeners.forEach((fn) => fn());
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "ko";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ko" || stored === "en" || stored === "ja" || stored === "zh") return stored;
  return "ko";
}

export function useTranslation() {
  const locale = useSyncExternalStore<Locale>(subscribe, getSnapshot, () => "ko" as Locale);
  const messages = MESSAGES[locale] ?? MESSAGES.ko;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = getNested(messages, key);
      if (typeof value !== "string") return key;
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`));
      }
      return value;
    },
    [messages]
  );

  const changeLocale = useCallback((newLocale: string) => {
    if (newLocale === "ko" || newLocale === "en" || newLocale === "ja" || newLocale === "zh") {
      setLocale(newLocale as Locale);
    }
  }, []);

  return { t, locale, changeLocale };
}