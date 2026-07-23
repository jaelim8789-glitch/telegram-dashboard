import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a stack you already have up — either the full docker-compose stack
 * (http://localhost, the default) or `npm run dev` + the backend running separately
 * (pass PLAYWRIGHT_BASE_URL=http://localhost:3002 or whatever port `next dev` picked).
 * These are integration tests: they need a real backend + Postgres + Redis behind
 * whatever baseURL you point them at, not just the frontend dev server.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup"],
      testIgnore: [/.*\.setup\.ts/, /admin-auth\.spec\.ts/, /mobile-qa\.spec\.ts/],
    },
    {
      // admin-auth.spec.ts specifically tests the *unauthenticated* redirect/login flow,
      // so it deliberately starts with no stored session.
      name: "chromium-no-auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /(admin-auth|prod-reply-macro)\.spec\.ts/,
    },
    /* ── Mobile QA projects (authenticated) ── */
    {
      name: "mobile-android",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /mobile-qa\.spec\.ts/,
      testIgnore: [/public-only\.spec\.ts/],
    },
    {
      name: "mobile-ios",
      use: {
        ...devices["iPhone 13"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /mobile-qa\.spec\.ts/,
      testIgnore: [/public-only\.spec\.ts/],
    },
    /* ── Mobile QA projects (unauthenticated — public pages) ── */
    {
      name: "mobile-android-no-auth",
      use: { ...devices["Pixel 5"] },
      testMatch: /public-only\.spec\.ts/,
    },
    {
      name: "mobile-ios-no-auth",
      use: { ...devices["iPhone 13"] },
      testMatch: /public-only\.spec\.ts/,
    },
  ],
});