const DB_NAME = "telemon-cache";
const DB_VERSION = 1;
const MAX_ENTRIES = 500;

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("cache")) {
        const store = db.createObjectStore("cache", { keyPath: "key" });
        store.createIndex("timestamp", "timestamp");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction("cache", "readonly");
    const store = tx.objectStore("cache");
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function cacheSet<T>(key: string, data: T) {
  try {
    const db = await openDB();
    // Evict old entries if over limit
    const tx = db.transaction("cache", "readwrite");
    const store = tx.objectStore("cache");
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result >= MAX_ENTRIES) {
        const index = store.index("timestamp");
        const cursorReq = index.openCursor(null, "prev");
        let deleted = 0;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && deleted < 100) {
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
          }
        };
      }
    };
    store.put({ key, data, timestamp: Date.now() } as CacheEntry<T>);
  } catch { /* ignore */ }
}

export async function cacheDelete(key: string) {
  try {
    const db = await openDB();
    const tx = db.transaction("cache", "readwrite");
    tx.objectStore("cache").delete(key);
  } catch { /* ignore */ }
}

export async function cacheClear() {
  try {
    const db = await openDB();
    const tx = db.transaction("cache", "readwrite");
    tx.objectStore("cache").clear();
  } catch { /* ignore */ }
}
