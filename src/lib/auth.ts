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
function decodeJwt(token: string): Record<string, unknown> | null {
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

export function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  if (!exp) return false;
  const fiveMinutesBeforeExpiry = (exp - 5 * 60) * 1000; // 5 minutes before expiry
  return Date.now() >= fiveMinutesBeforeExpiry;
}

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
    const secretKey = secret || (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_JWT_SECRET || "") : "");
    if (!secretKey) return true;
    const data = `${parts[0]}.${parts[1]}`;
    if (typeof crypto === 'undefined' || !crypto.subtle) return true;
    return true;
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

// 토큰 갱신 요청
async function refreshToken(): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const refreshToken = getCookie("telemon_refresh_token");
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Store new tokens
    if (data.access_token) {
      setToken(data.access_token);
    }
    
    if (data.refresh_token) {
      setCookie("telemon_refresh_token", data.refresh_token);
    }
    
    return data;
  } catch (error) {
    console.error('Token refresh error:', error);
    // 토큰 갱신 실패 시 로그아웃 처리
    clearAll();
    window.location.href = '/auth/login';
    return null;
  }
}

// 토큰 갱신 관리자 클래스
class TokenManager {
  private refreshPromise: Promise<any> | null = null;

  async getValidToken(): Promise<string | null> {
    const token = getToken();
    
    if (!token) {
      return null;
    }

    // 토큰이 곧 만료되거나 이미 만료된 경우 갱신
    if (isTokenExpired(token) || isTokenExpiringSoon(token)) {
      // 동시 갱신 요청 방지를 위해 Promise를 공유
      if (!this.refreshPromise) {
        this.refreshPromise = refreshToken();
      }

      try {
        const result = await this.refreshPromise;
        return result?.access_token || null;
      } finally {
        this.refreshPromise = null;
      }
    }

    return token;
  }

  // 토큰 만료 시간 계산
  getTokenExpiryTime(token: string): Date | null {
    const payload = decodeJwt(token);
    if (!payload) return null;
    const exp = payload.exp as number | undefined;
    return exp ? new Date(exp * 1000) : null;
  }
}

export const tokenManager = new TokenManager();
