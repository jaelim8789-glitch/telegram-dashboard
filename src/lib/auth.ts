const TOKEN_STORAGE_KEY = "admin_token";
const SESSION_TOKEN_KEY = "session_token";
const AUTH_EVENT_KEY = "telemon_auth_change";

export interface AuthSession {
  token: string | null;
  sessionToken: string | null;
  role: "admin" | "user" | "api_key" | null;
}

type AuthListener = (session: AuthSession) => void;
const listeners = new Set<AuthListener>();

function notify() {
  const session = getSession();
  for (const fn of listeners) {
    try { fn(session); } catch { /* swallow */ }
  }
}

export function onAuthChange(fn: AuthListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Cross-tab sync ──
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_STORAGE_KEY || e.key === SESSION_TOKEN_KEY) {
      notify();
    }
  });
}

export function getSession(): AuthSession {
  if (typeof window === "undefined") return { token: null, sessionToken: null, role: null };
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const sessionToken = window.localStorage.getItem(SESSION_TOKEN_KEY);
  return { token, sessionToken, role: getTokenRole(token) };
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  notify();
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  notify();
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  notify();
}

export function clearSessionToken(): void {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  notify();
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  notify();
}

// ── JWT helpers ──

export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  if (!exp) return false;
  return Date.now() >= exp * 1000;
}

export function getTokenRole(token: string | null): AuthSession["role"] {
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  const sub = payload.sub as string | undefined;
  if (!sub) return null;
  if (sub === "admin") return "admin";
  if (sub.startsWith("user:")) return "user";
  return null;
}

export function getTokenExpiry(token: string): Date | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const exp = payload.exp as number | undefined;
  return exp ? new Date(exp * 1000) : null;
}
