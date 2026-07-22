"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function getApplicationServerKey(): Uint8Array | undefined {
  const key = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!key) {
    console.warn("NEXT_PUBLIC_VAPID_KEY is not set; push subscription will fail in most browsers");
    return undefined;
  }
  return urlBase64ToUint8Array(key);
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null>;
export async function subscribeToPush(): Promise<PushSubscription | null>;
export async function subscribeToPush(registration?: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  let reg: ServiceWorkerRegistration;
  if (registration) {
    reg = registration;
  } else {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    reg = await navigator.serviceWorker.ready;
  }

  if (!reg.pushManager) return null;

  try {
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = getApplicationServerKey();
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }
    return subscription;
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;
    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}
