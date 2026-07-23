/**
 * Visual regression tests — screenshot comparison against stored baselines.
 *
 * Run:  npx playwright test --project=chromium visual-regression.spec.ts
 * Update baselines:  npx playwright test --update-snapshots --project=chromium visual-regression.spec.ts
 *
 * These tests capture key pages and compare pixel-by-pixel against a stored
 * baseline screenshot. Any unintended visual change fails the test.
 *
 * ⚠ Requires the full stack (frontend + backend) to be running.
 *    PLAYWRIGHT_BASE_URL defaults to http://localhost.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const SNAPSHOT_DIR = "e2e/snapshots";

test.describe("Visual Regression — core pages", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure consistent viewport for reproducible screenshots
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("Dashboard overview — no unexpected layout shifts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Allow splash + data loading to settle
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("dashboard-overview.png", {
      maxDiffPixelRatio: 0.02, // 2% pixel tolerance for animations
      threshold: 0.3,
    });
  });

  test("Send tab — compose panel renders correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Navigate to send tab
    await page.click('[data-tour="nav-send"]');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("send-compose.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });

  test("Group tab — group list renders", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.click('[data-tour="nav-group"]');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("group-list.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });

  test("Log tab — broadcast history renders", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.click('[data-tour="nav-log"]');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("log-history.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });

  test("Account registration form — step 1 renders", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("register-step1.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });

  test("404 page — renders gracefully", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("404-page.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });
});

test.describe("Visual Regression — mobile viewports", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

  test("Mobile dashboard — responsive layout", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("mobile-dashboard.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });

  test("Mobile send tab — responsive compose", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.click("text=발송");
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("mobile-send.png", {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    });
  });
});
