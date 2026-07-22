"use client";

import { useEffect, useState, type ReactNode } from "react";
import { retrieveLaunchParams } from "@tma.js/sdk-react";
import { init } from "./core/init";

export default function MiniAppLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        const isTma =
          typeof window !== "undefined" &&
          window.location.hash?.includes("tgWebAppData");
        if (isTma || process.env.NODE_ENV === "development") {
          await init({ debug: true, eruda: false, mockForMacOS: false });
        }
        setReady(true);
      } catch (e) {
        console.warn("MiniApp init failed (not in Telegram):", e);
        setError(null);
        setReady(true);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no");
    }
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      const el = document.createElement("meta");
      el.name = "theme-color";
      el.content = "#17212b";
      document.head.appendChild(el);
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--tg-theme-bg-color,#17212b)]" style={{ minHeight: "-webkit-fill-available" }}>
        <div className="animate-spin h-8 w-8 border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #17212b)",
        color: "var(--tg-theme-text-color, #f5f5f5)",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {children}
    </div>
  );
}
