import {
  setDebug,
  backButton,
  initData,
  init as initSDK,
  miniApp,
  viewport,
  themeParams,
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
}