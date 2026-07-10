/**
 * TeleMon domain architecture configuration.
 *
 * Centralizes all domain URLs so they can be changed in one place.
 * No hardcoded domain strings should appear in page components.
 *
 * Domain mapping:
 *   telemon.online  → public marketing website (this app)
 *   telemon.store   → customer dashboard
 *   telemon.space   → admin/operations
 */

export const SITE = {
  /** Public marketing website */
  online: process.env.NEXT_PUBLIC_SITE_URL ?? "https://telemon.online",
  /** Customer dashboard application */
  store: process.env.NEXT_PUBLIC_STORE_URL ?? "https://telemon.store",
  /** Admin/operations area */
  space: process.env.NEXT_PUBLIC_SPACE_URL ?? "https://telemon.space",
  /** Brand name */
  brand: "TeleMon",
  /** Support contact */
  support: {
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@telemon.io",
    telegram: process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ?? "@telemon_support",
  },
} as const;

/** API base URL used by public pages (signup, get-api-key, etc.) */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";