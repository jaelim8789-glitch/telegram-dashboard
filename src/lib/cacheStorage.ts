"use client";
export async function cacheGet<T>(store: string, key: string): Promise<T | null> {
  try { const db = await openDB(); const tx = db.transaction(store, "readonly"); const val = await tx.objectStore(store).get(key); return val?.data ?? null; } catch { return null; }
}
export async function cacheSet(store: string, key: string, data: unknown, ttlMs = 300000): Promise<void> {
  try { const db = await openDB(); const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put({ key, data, expiresAt: Date.now() + ttlMs }); await tx.done; } catch {}
}
export async function cacheClear(store: string): Promise<void> {
  try { const db = await openDB(); const tx = db.transaction(store, "readwrite"); tx.objectStore(store).clear(); await tx.done; } catch {}
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("telemon-cache", 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains("api-responses")) db.createObjectStore("api-responses", { keyPath: "key" }); if (!db.objectStoreNames.contains("dashboard-stats")) db.createObjectStore("dashboard-stats", { keyPath: "key" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
