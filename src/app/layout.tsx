import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
  display: "optional",
});
import { ToastProvider } from "@/components/ui/Toast";
import { THEME_INIT_SCRIPT } from "@/lib/useTheme";
import { RuntimeInitializer } from "@/lib/RuntimeInitializer";
import { PwaRegister } from "@/components/PwaRegister";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { GestureTour } from "@/components/ui/GestureTour";
import ShareTargetHandler from "@/components/ShareTargetHandler";
import LiveChat from "@/components/LiveChat";
import { MobileOptimizations } from "@/components/MobileOptimizations";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://telemon.online"),
  manifest: "/manifest.json",
  title: {
    default: "TeleMon | 텔레그램 자동화 매크로 플랫폼",
    template: "%s | TeleMon",
  },
  description:
    "Telegram 계정 관리, 자동 응답, 예약 발송, 그룹 검색, 계정 건강 모니터링, 전달 분석까지. 코딩 없이 하나의 대시보드에서 텔레그램을 완전 자동화하세요.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
  appleWebApp: {
    capable: true,
    title: "TeleMon",
    statusBarStyle: "black-translucent",
    startupImage: ["/icons/icon-512.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#bfa260",
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets data-theme on <html> synchronously before first paint, so the
            correct light/dark palette is already applied by the time CSS
            renders — no flash of the wrong theme while React hydrates.
            suppressHydrationWarning above is required because this script
            adds a data-theme attribute and a light/dark class to <html>
            before React hydrates; without it React treats every page as a
            root-level hydration mismatch (console error #418) and falls
            back to a client-side re-render of the whole tree, which is what
            was causing tab/button clicks to silently misfire right after
            first paint. */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/icons/icon-192.svg" as="image" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"} />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"} crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-app-bg text-app-text font-sans">
        <SplashScreen />
        <GestureTour />
        <ShareTargetHandler />
        <RuntimeInitializer />
        <PwaRegister />
        <PwaInstallPrompt />
        <MobileOptimizations />
        <ToastProvider>{children}</ToastProvider>
        <LiveChat />
      </body>
    </html>
  );
}