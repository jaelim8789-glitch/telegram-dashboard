/**
 * TeleMon domain architecture configuration.
 *
 * Centralizes all domain URLs so they can be changed in one place.
 * No hardcoded domain strings should appear in page components.
 *
 * Production domain mapping (handled by nginx):
 *   telemon.online      → public marketing website (landing page at /)
 *   app.telemon.online   → authenticated application (dashboard at /app/)
 *
 * API requests use same-origin /api/ proxy — no separate api.* domain.
 *   telemon.online/api/      → FastAPI backend
 *   app.telemon.online/api/  → FastAPI backend
 *
 * Reserved:
 *   telemon.space     → reserved
 *   telemon.store     → reserved
 */
export const SITE = {
  /** Public marketing website */
  online: process.env.NEXT_PUBLIC_SITE_URL ?? "https://telemon.online",
  /** Authenticated application dashboard */
  app: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.telemon.online",
  /** FastAPI backend */
  api: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  /** Brand name */
  brand: "TeleMon",
  /** Support contact */
  support: {
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@telemon.io",
    telegram: process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ?? "@telemon_support",
  },
} as const;
