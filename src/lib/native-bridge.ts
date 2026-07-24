"use client";

/**
 * TeleMon Native Bridge ??Capacitor ?¤ì´?°ë¸Œ ê¸°ëŠ¥ ì¶”ìƒ??
 * ???˜ê²½?ì„œ??gracefully fallback, ?¤ì´?°ë¸Œ?ì„œ??ì§„ì§œ ê¸°ëŠ¥ ?¬ìš©
 */

let native: boolean | null = null;

function isNative(): boolean {
  if (native !== null) return native;
  native = typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
  return native;
}

// ?€?€ Push Notifications ?€?€

export async function registerNativePush() {
  if (!isNative()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return false;
    await PushNotifications.register();
    PushNotifications.addListener("registration", (token: { value: string }) => {
      fetch("/api/push/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value, platform: isNative() ? "capacitor" : "web" }),
      }).catch(() => {});
    });
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      // Handled by SW or native
    });
    return true;
  } catch { return false; }
}

// ?€?€ Haptics ?€?€

export async function nativeHaptic(type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (["success", "warning", "error"].includes(type)) {
      await Haptics.notification({ type: type as any });
    } else {
      await Haptics.impact({ style: type as any });
    }
  } catch (e) { console.warn('Unhandled error in native-bridge', e) }
}

// ?€?€ Share ?€?€

export async function nativeShare(title: string, text: string, url?: string) {
  if (!isNative()) return navigator.share?.({ title, text, url }).catch(() => {});
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url });
  } catch (e) { console.warn('Unhandled error in native-bridge', e) }
}

// ?€?€ Status Bar ?€?€

export async function setStatusBarStyle(style: "light" | "dark") {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: style === "dark" ? Style.Dark : Style.Light });
  } catch (e) { console.warn('Unhandled error in native-bridge', e) }
}

// ?€?€ App Badge ?€?€

export async function setNativeBadge(count: number) {
  if (!isNative()) return;
  try {
    const mod = await import("@capacitor/badge").catch(() => null);
    if (!mod) return;
    if (count > 0) await mod.Badge.set({ badge: count });
    else await mod.Badge.clear();
  } catch (e) { console.warn('Unhandled error in native-bridge', e) }
}

// ?€?€ Filesystem ?€?€

export async function writeNativeFile(path: string, data: string) {
  if (!isNative()) return;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    await Filesystem.writeFile({ path, data, directory: Directory.Documents });
  } catch (e) { console.warn('Unhandled error in native-bridge', e) }
}

export async function readNativeFile(path: string): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const result = await Filesystem.readFile({ path, directory: Directory.Documents });
    return typeof result.data === "string" ? result.data : null;
  } catch { return null; }
}
