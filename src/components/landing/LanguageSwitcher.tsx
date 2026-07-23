"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

const LANGUAGES = [
  { code: "ko", label: "KO" },
  { code: "en", label: "EN" },
  { code: "ja", label: "日" },
  { code: "zh", label: "中" },
] as const;

export function LanguageSwitcher() {
  const { locale, changeLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center rounded-md border border-app-border bg-app-card/50 p-0.5">
        {LANGUAGES.map((lang) => (
          <span
            key={lang.code}
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
              lang.code === "ko"
                ? "bg-app-primary text-app-bg shadow-sm"
                : "text-app-text-muted"
            }`}
          >
            {lang.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center rounded-md border border-app-border bg-app-card/50 p-0.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => changeLocale(lang.code)}
          className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
            locale === lang.code
              ? "bg-app-primary text-app-bg shadow-sm"
              : "text-app-text-muted hover:text-app-text"
          }`}
          aria-label={{ ko: "한국어", en: "English", ja: "日本語", zh: "中文" }[lang.code]}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}