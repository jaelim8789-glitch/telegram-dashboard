import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { THEME_INIT_SCRIPT } from "@/lib/useTheme";
import { RuntimeInitializer } from "@/lib/RuntimeInitializer";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { PwaRegister } from "@/components/PwaRegister";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { GestureTour } from "@/components/ui/GestureTour";
import { BiometricLock } from "@/components/ui/BiometricLock";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://telemon.online"),
  title: {
    default: "TeleMon | 텔레그램 자동화 매크로 플랫폼",
    template: "%s | TeleMon",
  },
  description:
    "Telegram 계정 관리, 자동 응답, 예약 발송, 그룹 검색, 계정 건강 모니터링, 전달 분석까지. 코딩 없이 하나의 대시보드에서 텔레그램을 완전 자동화하세요.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-app-bg text-app-text font-sans">
        <SplashScreen />
        <GestureTour />
        <BiometricLock>
          <RuntimeInitializer />
          <CommandPaletteProvider />
          <PwaRegister />
          <PwaInstallPrompt />
          <ToastProvider>{children}</ToastProvider>
        </BiometricLock>
      </body>
    </html>
  );
}
