/**
 * Mobile public page tests (no auth required).
 * Runs in mobile-android-no-auth / mobile-ios-no-auth projects.
 * Uses the deployed v1-style routes: /login, /purchase, /targets.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const LONG = "가나다라마바사아자차카타파하".repeat(20);

async function narrow(p: Page) { await p.setViewportSize({ width: 320, height: 700 }); }
async function land(p: Page) {
  const c = p.viewportSize() ?? { width: 393, height: 852 };
  await p.setViewportSize({ width: Math.max(c.width, c.height), height: Math.min(c.width, c.height) });
}
async function port(p: Page) {
  const c = p.viewportSize() ?? { width: 852, height: 393 };
  await p.setViewportSize({ width: Math.min(c.width, c.height), height: Math.max(c.width, c.height) });
}

test.describe("Mobile Public Pages QA", () => {
  test.describe("1. 로그인 페이지", () => {
    test("렌더링 + 320px + 회전", async ({ page }) => {
      test.setTimeout(30000);
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page); await page.waitForTimeout(200);
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await land(page); await page.waitForTimeout(200);
      await port(page);
    });
    test("키보드 입력 (아이디/비밀번호)", async ({ page }) => {
      test.setTimeout(20000);
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const inputs = page.locator("input");
      const count = await inputs.count();
      if (count > 0) {
        await inputs.first().fill(LONG.slice(0, 30));
        await inputs.first().fill("testuser");
      }
      if (count > 1) {
        await inputs.nth(1).fill("testpass123");
      }
    });
  });

  test.describe("2. 구매 페이지", () => {
    test("렌더링 + 320px", async ({ page }) => {
      test.setTimeout(20000);
      await page.goto("/purchase", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page); await page.waitForTimeout(200);
    });
  });

  test.describe("3. 타겟 페이지", () => {
    test("렌더링 + 320px", async ({ page }) => {
      test.setTimeout(20000);
      await page.goto("/targets", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page); await page.waitForTimeout(200);
    });
  });
});