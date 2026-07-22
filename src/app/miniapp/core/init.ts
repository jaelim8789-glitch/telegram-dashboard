import {
  setDebug,
  backButton,
  initData,
  init as initSDK,
  miniApp,
  viewport,
  themeParams,
  HapticFeedback,
} from "@tma.js/sdk-react";

export async function init(options: {
  debug: boolean;
  eruda: boolean;
  mockForMacOS: boolean;
}): Promise<void> {
  setDebug(options.debug);
  initSDK();

  backButton.mount();
  initData.restore();

  try {
    miniApp.mount();
    themeParams.bindCssVars();
  } catch {
    /* miniApp unavailable outside Telegram */
  }

  try {
    await viewport.mount();
    viewport.bindCssVars();
  } catch {
    /* viewport unavailable outside Telegram */
  }

  // Initialize haptic feedback for better mobile UX
  try {
    const haptic = new (HapticFeedback as any)("8.0");
    haptic.impactOccurred("light");
  } catch {
    /* haptic feedback unavailable in some environments */
  }

  // Enable mobile-friendly viewport settings
  if (typeof document !== "undefined") {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no";
    document.head.appendChild(meta);
  }
}