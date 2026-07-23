"use client";

import { useEffect } from "react";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { GestureTour } from "@/components/ui/GestureTour";
import { ShareTargetHandler } from "@/components/ui/ShareTargetHandler";
import { RuntimeInitializer } from "@/components/ui/RuntimeInitializer";
import { PwaRegister } from "@/components/ui/PwaRegister";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";
import { ToastProvider } from "@/components/ui/Toast";
import { LiveChat } from "@/components/ui/LiveChat";
import { MobileOptimizations } from "@/components/MobileOptimizations";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { PerformanceProvider } from "@/contexts/PerformanceContext";
import { initHighlight } from "@/lib/highlight";
import { PerformanceOverlay } from "@/lib/performanceMonitor";

const THEME_INIT_SCRIPT = `
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
`;

export default function RootLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    initHighlight();
  }, []);

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="preload" href="/fonts/main-font.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/icons/icon-192.svg" as="image" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"} />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"} crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-app-bg text-app-text font-sans">
        <NetworkStatus />
        <SplashScreen />
        <GestureTour />
        <ShareTargetHandler />
        <RuntimeInitializer />
        <PwaRegister />
        <PwaInstallPrompt />
        <MobileOptimizations />
        <PerformanceProvider>
          <ToastProvider>{children}</ToastProvider>
          <PerformanceOverlay />
        </PerformanceProvider>
        <LiveChat />
      </body>
    </html>
  );
}
