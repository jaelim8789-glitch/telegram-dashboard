"use client";

import dynamic from "next/dynamic";

const MobilePerformanceMonitor = dynamic(
  () => import("@/components/ui/MobilePerformanceMonitor").then((m) => ({ default: m.MobilePerformanceMonitor })),
  { ssr: false }
);
const MobileKeyboardHandler = dynamic(
  () => import("@/components/ui/MobileKeyboardHandler").then((m) => ({ default: m.MobileKeyboardHandler })),
  { ssr: false }
);
const MobileCacheManager = dynamic(
  () => import("@/components/ui/MobileCacheManager").then((m) => ({ default: m.MobileCacheManager })),
  { ssr: false }
);
const MobileImageOptimizer = dynamic(
  () => import("@/components/ui/MobileImageOptimizer").then((m) => ({ default: m.MobileImageOptimizer })),
  { ssr: false }
);
const MobileAccessibilityEnhancer = dynamic(
  () => import("@/components/ui/MobileAccessibilityEnhancer").then((m) => ({ default: m.MobileAccessibilityEnhancer })),
  { ssr: false }
);
const MobilePowerOptimizer = dynamic(
  () => import("@/components/ui/MobilePowerOptimizer").then((m) => ({ default: m.MobilePowerOptimizer })),
  { ssr: false }
);
const MobilePushNotifier = dynamic(
  () => import("@/components/ui/MobilePushNotifier").then((m) => ({ default: m.MobilePushNotifier })),
  { ssr: false }
);
const MobileLocalizationOptimizer = dynamic(
  () => import("@/components/ui/MobileLocalizationOptimizer").then((m) => ({ default: m.MobileLocalizationOptimizer })),
  { ssr: false }
);
const MobileOfflineCapability = dynamic(
  () => import("@/components/ui/MobileOfflineCapability").then((m) => ({ default: m.MobileOfflineCapability })),
  { ssr: false }
);
const MobileFontOptimizer = dynamic(
  () => import("@/components/ui/MobileFontOptimizer").then((m) => ({ default: m.MobileFontOptimizer })),
  { ssr: false }
);

export function MobileOptimizations() {
  return (
    <>
      <MobilePerformanceMonitor />
      <MobileKeyboardHandler />
      <MobileCacheManager />
      <MobileImageOptimizer />
      <MobileAccessibilityEnhancer />
      <MobilePowerOptimizer />
      <MobilePushNotifier />
      <MobileLocalizationOptimizer />
      <MobileOfflineCapability />
      <MobileFontOptimizer />
    </>
  );
}
