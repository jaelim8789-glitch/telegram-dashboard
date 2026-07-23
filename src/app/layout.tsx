import type { Metadata } from "next";
import "./globals.css";
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
import { PerformanceOverlay } from "@/lib/performanceMonitor";

export const metadata: Metadata = {
  title: "TeleMon",
  description: "Telegram Auto Reply Management Dashboard",
};

// 테마 초기화 스크립트
const THEME_INIT_SCRIPT = `
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) { }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/main-font.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Hydration 오류 방지를 위해 스크립트를 dangerouslySetInnerHTML로 삽입
            hydration이 발생하면 클라이언트와 서버의 렌더링 상태가 달라서 발생하는
            FOUC(Flash of Unstyled Content)를 방지하고자 하는 의도지만
            실제로는 브라우저가 첫 렌더링을 하기 전에 테마를 적용해야 하므로
            JS로 테마를 조절하는 것이 더 효과적이다. 
            이 스크립트는 Next.js hydration 이전에 실행되어 테마를 미리 설정한다.
            만약 hydration 이후에 테마가 변경되면 깜빡임 현상이 발생할 수 있으므로
            SSR 시에도 동일한 테마가 적용되도록 한다. */}
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