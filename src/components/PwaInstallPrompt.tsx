"use client";

import { useState, useEffect } from "react";
import { Download, Share2, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA ?¤ì¹˜ ?„ë¡¬?„íŠ¸ ??beforeinstallprompt ?´ë²¤?¸ë? ìºì¹˜?˜ì—¬
 * "???¤ì¹˜?˜ê¸°" ë²„íŠ¼???œì‹œ?©ë‹ˆ?? ?¬ìš©?ê? ê±°ì ˆ?˜ë©´ 7?¼ê°„ ?¤ì‹œ ??ë³´ì…?ˆë‹¤.
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptMode, setPromptMode] = useState<"native" | "ios" | null>(null);
  const [show, setShow] = useState(false);
  const DISMISS_KEY = "pwa_install_dismissed_at";
  const VISIT_KEY = "pwa_install_visit_count";
  const LAST_VISIT_DAY_KEY = "pwa_install_last_visit_day";

  function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  function isIosSafari() {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    return isIos && isSafari;
  }

  useEffect(() => {
    if (isInstalled()) return;

    let visitCount = 1;
    try {
      const nowDay = new Date().toISOString().slice(0, 10);
      const lastVisitDay = localStorage.getItem(LAST_VISIT_DAY_KEY);
      const storedVisits = Number(localStorage.getItem(VISIT_KEY) || "0");
      visitCount = lastVisitDay === nowDay ? Math.max(storedVisits, 1) : storedVisits + 1;
      localStorage.setItem(VISIT_KEY, String(visitCount));
      localStorage.setItem(LAST_VISIT_DAY_KEY, nowDay);

      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const elapsed = Date.now() - Number(dismissed);
        if (elapsed < 5 * 24 * 60 * 60 * 1000) return;
        localStorage.removeItem(DISMISS_KEY);
      }
    } catch (e) { console.warn('Unhandled error in PwaInstallPrompt', e) }

    if (visitCount < 2) return;

    const displayTimer = window.setTimeout(() => {
      if (isInstalled()) return;
      if (deferredPrompt) {
        setPromptMode("native");
        setShow(true);
        return;
      }
      if (isIosSafari()) {
        setPromptMode("ios");
        setShow(true);
      }
    }, 12000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!show) {
        setPromptMode("native");
      }
    };
    const onInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(displayTimer);
    };
  }, [deferredPrompt, show]);

  async function handleInstall() {
    if (!deferredPrompt || promptMode !== "native") return;
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
    } catch (e) { console.warn('Unhandled error in PwaInstallPrompt', e) }
  }

  if (!show || !promptMode) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="mx-auto max-w-sm rounded-2xl border border-app-border/60 bg-app-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-primary/10">
            {promptMode === "native" ? (
              <Download className="h-5 w-5 text-app-primary" />
            ) : (
              <Share2 className="h-5 w-5 text-app-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-app-text">TeleMon ???¤ì¹˜</p>
            <p className="text-xs text-app-text-muted mt-0.5">
              {promptMode === "native"
                ? "?ˆí™”ë©´ì— ì¶”ê??˜ë©´ ?¤ìŒ ?¤í–‰ë¶€????ë¹ ë¥´ê³??ˆì •?ìœ¼ë¡??´ë¦½?ˆë‹¤"
                : "iPhone/iPad?ì„œ??ê³µìœ  ë²„íŠ¼???„ë¥¸ ??'???”ë©´??ì¶”ê?'ë¥?? íƒ?´ì£¼?¸ìš”"}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {promptMode === "native" ? (
          <button
            onClick={handleInstall}
            className="mt-3 w-full rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            ???¤ì¹˜?˜ê³  ë¹ ë¥´ê²??´ê¸°
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-app-border/70 bg-app-bg px-3 py-2 text-[12px] text-app-text-muted">
            Safari ?˜ë‹¨??<span className="font-semibold text-app-text">ê³µìœ </span> ë²„íŠ¼ ??<span className="font-semibold text-app-text">???”ë©´??ì¶”ê?</span>
          </div>
        )}
      </div>
    </div>
  );
}