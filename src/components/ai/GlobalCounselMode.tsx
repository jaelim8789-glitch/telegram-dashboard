"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, ChevronUp, Settings, Sparkles } from "lucide-react";
import { FLAG_BY_LANG, LANG_NAME, COUNTRY_EXPRESSIONS } from "@/lib/ai/translation-prompt";
import { cn } from "@/lib/cn";

interface GlobalCounselModeProps {
  detectedLang: string;
  myLang: string;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  onLangChange?: (lang: string) => void;
}

const TARGET_LANGS = [
  { code: "en", label: "영어" },
  { code: "ja", label: "일본어" },
  { code: "zh", label: "중국어" },
  { code: "th", label: "태국어" },
  { code: "ru", label: "러시아어" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "프랑스어" },
  { code: "de", label: "독일어" },
];

export function GlobalCounselMode({
  detectedLang,
  myLang,
  enabled,
  onToggle,
  onLangChange,
}: GlobalCounselModeProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const detectedFlag = FLAG_BY_LANG[detectedLang] || "🌐";
  const detectedName = LANG_NAME[detectedLang] || detectedLang || "감지 중...";
  const myFlag = FLAG_BY_LANG[myLang] || "🇰🇷";
  const expr = COUNTRY_EXPRESSIONS[detectedLang];
  const recommendedGreeting = expr?.greeting;
  const recommendedFollowUp = expr?.followUp;

  return (
    <div className="rounded-xl border border-app-border/60 bg-app-card/80 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-app-card-hover"
      >
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg text-xs",
          enabled ? "bg-app-primary/15 text-app-primary" : "bg-app-border/30 text-app-text-muted",
        )}>
          <Globe className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-semibold text-app-text flex-1">
          {enabled ? "국제 상담 모드" : "번역 모드"}
        </span>
        <span className="text-[10px] text-app-text-muted">
          {detectedFlag} {detectedName}
        </span>
        {expanded ? <ChevronUp className="h-3 w-3 text-app-text-muted" /> : <ChevronDown className="h-3 w-3 text-app-text-muted" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-app-border/30 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-app-text-muted">상대:</span>
                  <span className="font-medium text-app-text">{detectedFlag} {detectedName}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-app-text-muted">나:</span>
                  <span className="font-medium text-app-text">{myFlag} 한국어</span>
                </div>
              </div>

              {enabled && recommendedGreeting && (
                <div className="rounded-lg border border-app-border/30 bg-app-bg/50 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-app-text-muted mb-1">
                    <Sparkles className="h-3 w-3" />
                    <span>추천 표현 ({detectedName})</span>
                  </div>
                  <p className="text-[11px] text-app-text font-medium">{recommendedGreeting}</p>
                  <p className="text-[10px] text-app-text-secondary mt-0.5">{recommendedFollowUp}</p>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggle(!enabled)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                    enabled
                      ? "bg-app-primary text-white"
                      : "border border-app-border/60 text-app-text-muted hover:border-app-primary/30 hover:text-app-text",
                  )}
                >
                  <Globe className="h-3 w-3" />
                  {enabled ? "ON" : "OFF"}
                </button>

                <button
                  onClick={() => setShowSettings((p) => !p)}
                  className="flex items-center gap-1 rounded-lg border border-app-border/60 px-3 py-1.5 text-[11px] text-app-text-muted hover:text-app-text transition-colors"
                >
                  <Settings className="h-3 w-3" />
                  설정
                </button>
              </div>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="space-y-1.5"
                  >
                    <label className="text-[10px] text-app-text-muted font-medium">
                      상대방 언어 설정 (자동 감지 외)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {TARGET_LANGS.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => onLangChange?.(l.code)}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] transition-colors",
                            l.code === detectedLang
                              ? "bg-app-primary/15 text-app-primary"
                              : "bg-app-border/20 text-app-text-muted hover:bg-app-border/40",
                          )}
                        >
                          {FLAG_BY_LANG[l.code] || "🌐"} {l.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
