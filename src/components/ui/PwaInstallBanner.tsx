"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

const DISMISSED_KEY = "telemon-pwa-install-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isDismissed = (): boolean => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (!raw) return false;
      return Date.now() < Number(raw);
    } catch {
      return false;
    }
  };

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch (e) { console.warn('Unhandled error in PwaInstallBanner', e) }
    setDeferredPrompt(null);
  }, []);

  const install = useCallback(async (prompt: BeforeInstallPromptEvent) => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, []);

  return { deferredPrompt, isDismissed, dismiss, install };
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const { deferredPrompt, isDismissed, dismiss, install } = usePwaInstall();

  useEffect(() => {
    const inStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!inStandalone && deferredPrompt && !isDismissed()) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [deferredPrompt, isDismissed]);

  const promptRef = useRef(deferredPrompt);

  useEffect(() => {
    promptRef.current = deferredPrompt;
  }, [deferredPrompt]);

  return (
    <AnimatePresence>
      {show && promptRef.current && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 mx-auto mb-4 w-[calc(100%-32px)] max-w-sm",
            "rounded-2xl border border-app-border bg-app-card/90",
            "backdrop-blur-xl p-4 shadow-lg"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/10">
              <Download className="h-5 w-5 text-app-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-app-text">?±ìœ¼ë¡??¤ì¹˜?˜ê¸°</p>
              <p className="mt-0.5 text-xs text-app-text-subtle">
                TeleMon???ˆí™”ë©´ì— ì¶”ê??˜ì„¸??              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                dismiss();
                setShow(false);
              }}
              className="flex-1 rounded-lg border border-app-border bg-app-card px-4 py-2.5 text-xs font-semibold text-app-text-muted"
              style={{ minHeight: 44 }}
            >
              ?¤ìŒ??            </button>
            <button
              type="button"
              onClick={() => {
                if (promptRef.current) {
                  install(promptRef.current);
                  setShow(false);
                }
              }}
              className="flex-1 rounded-lg bg-app-accent px-4 py-2.5 text-xs font-semibold text-white"
              style={{ minHeight: 44 }}
            >
              ?¤ì¹˜
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
