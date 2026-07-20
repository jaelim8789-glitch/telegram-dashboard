"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA 설치 프롬프트 — beforeinstallprompt 이벤트를 캐치하여
 * "앱 설치하기" 버튼을 표시합니다. 사용자가 거절하면 7일간 다시 안 보입니다.
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const DISMISS_KEY = "pwa_install_dismissed_at";

  useEffect(() => {
    // 이미 설치되었거나, 최근에 거절한 경우 표시 안 함
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const elapsed = Date.now() - Number(dismissed);
        if (elapsed < 7 * 24 * 60 * 60 * 1000) return; // 7일
        localStorage.removeItem(DISMISS_KEY);
      }
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="mx-auto max-w-sm rounded-2xl border border-app-border/60 bg-app-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-primary/10">
            <Download className="h-5 w-5 text-app-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-app-text">TeleMon 앱 설치</p>
            <p className="text-xs text-app-text-muted mt-0.5">
              홈화면에 추가하면 앱처럼 더 빠르게 사용할 수 있습니다
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-3 w-full rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          앱 설치하기
        </button>
      </div>
    </div>
  );
}