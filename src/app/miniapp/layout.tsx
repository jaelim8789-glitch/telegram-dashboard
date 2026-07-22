"use client";

import { useEffect, useState, type ReactNode } from "react";
import { init } from "./core/init";
import { GlobalToast } from "@/components/ui/GlobalToast";
import { CommandPalette as CommandPaletteMobile } from "@/components/ui/CommandPaletteMobile";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { MobileKeyboardHandler } from "@/components/ui/MobileKeyboardHandler";

export default function MiniAppLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setOpen = useCommandPaletteStore(s => s.setOpen);
  const launchParams = typeof window !== "undefined" ? (() => { try { const m = require("@tma.js/sdk-react"); return m.retrieveLaunchParams(); } catch { return null; } })() : null;

  useKeyboardShortcut("k", () => setOpen(true), { ctrl: true });

  useEffect(() => {
    async function setup() {
      try {
        const isTma = typeof window !== "undefined" && window.location.hash?.includes("tgWebAppData");
        if (isTma || process.env.NODE_ENV === "development") {
          await init({ debug: true, eruda: false, mockForMacOS: false });
        }
        setReady(true);
      } catch (e) {
        console.warn("MiniApp init failed:", e);
        setError(null);
        setReady(true);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) { const el = document.createElement("meta"); el.name = "theme-color"; el.content = "#17212b"; document.head.appendChild(el); }
  }, []);

  useEffect(() => {
    // iOS Safari에서 키보드에 의해 가려지는 문제 해결
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const handleResize = () => {
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${viewportHeight}px`);
        
        // 키보드가 올라올 때 body에 클래스 추가
        const isKeyboardVisible = window.innerHeight > viewportHeight * 0.75;
        if (isKeyboardVisible) {
          document.body.classList.remove('keyboard-hidden');
          document.body.classList.add('keyboard-visible');
        } else {
          document.body.classList.remove('keyboard-visible');
          document.body.classList.add('keyboard-hidden');
        }
      };

      window.visualViewport?.addEventListener('resize', handleResize);
      handleResize(); // 초기 설정

      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        document.documentElement.style.removeProperty('--vh');
      };
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--tg-theme-bg-color,#17212b)", minHeight: "-webkit-fill-available" }}>
        <div className="animate-spin h-8 w-8 border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        height: '100vh',
        maxHeight: '100vh',
        minHeight: 'var(--vh, 100vh)',
        backgroundColor: "var(--tg-theme-bg-color, #17212b)", 
        color: "var(--tg-theme-text-color, #f5f5f5)",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)"
      }}
    >
      <GlobalToast />
      {children}
      <CommandPaletteMobile />
    </div>
  );
}