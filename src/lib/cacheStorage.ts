"use client";

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const DB_NAME = "telemon-cache";
const DB_VERSION = 1;
const STORES = ["api-responses", "dashboard-stats", "widget-config"] as const;

const DEFAULT_TTL: Record<string, number> = {
  "api-responses": 5 * 60 * 1000,
  "dashboard-stats": 30 * 60 * 1000,
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      cleanupExpired(db);
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function cleanupExpired(db: IDBDatabase) {
  for (const store of STORES) {
    if (!db.objectStoreNames.contains(store)) continue;
    const tx = db.transaction(store, "readwrite");
    const objectStore = tx.objectStore(store);
    const cursorRequest = objectStore.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      const entry = cursor.value as CacheEntry<unknown>;
      if (entry.expiry && Date.now() > entry.expiry) {
        cursor.delete();
      }
      cursor.continue();
    };
  }
}

export async function cacheGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const objectStore = tx.objectStore(store);
    const request = objectStore.get(key);
    request.onsuccess = () => {
      const entry = request.result as CacheEntry<T> | undefined;
      if (!entry) return resolve(null);
      if (entry.expiry && Date.now() > entry.expiry) {
        db.transaction(store, "readwrite").objectStore(store).delete(key);
        return resolve(null);
      }
      resolve(entry.data);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function cacheSet<T>(store: string, key: string, data: T, ttl?: number): Promise<void> {
  const db = await openDb();
  const effectiveTtl = ttl ?? DEFAULT_TTL[store] ?? 5 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const entry: CacheEntry<T> = { data, expiry: Date.now() + effectiveTtl };
    const request = tx.objectStore(store).put(entry, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheDelete(store: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const request = tx.objectStore(store).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheClear(store: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const request = tx.objectStore(store).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
