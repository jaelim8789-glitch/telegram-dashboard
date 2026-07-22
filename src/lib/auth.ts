const TOKEN_KEY = "telemon_token";
const SESSION_TOKEN_KEY = "telemon_session_token";
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

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY || e.key === SESSION_TOKEN_KEY) {
      notify();
    }
  });
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict; Secure`;
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict; Secure`;
}

export function getSession(): AuthSession {
  if (typeof window === "undefined") return { token: null, sessionToken: null, role: null };
  const token = getCookie(TOKEN_KEY);
  const sessionToken = getCookie(SESSION_TOKEN_KEY);
  return { token, sessionToken, role: getTokenRole(token) };
}

export function getToken(): string | null {
  return getCookie(TOKEN_KEY);
}

export function setToken(token: string): void {
  setCookie(TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY));
  notify();
}

export function clearToken(): void {
  removeCookie(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY));
  notify();
}

export function getSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  setCookie(SESSION_TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY));
  notify();
}

export function clearSessionToken(): void {
  removeCookie(SESSION_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY));
  notify();
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  removeCookie(TOKEN_KEY);
  removeCookie(SESSION_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY));
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

export function verifyJwtSignature(token: string, secret?: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    const alg = header.alg || "HS256";
    if (!alg.startsWith("HS")) return false;
    const secretKey = secret || typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_JWT_SECRET || process.env.JWT_SECRET);
    if (!secretKey) return true;
    const data = `${parts[0]}.${parts[1]}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    return crypto.subtle?.importKey?.("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
      .then((key) => {
        const sig = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
        return crypto.subtle.verify("HMAC", key, sig, encoder.encode(data));
      })
      .catch(() => true) ?? true;
  } catch {
    return true;
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
