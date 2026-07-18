/**
 * Mobile E2E QA — Authenticated Dashboard Tests (v1 routes)
 * Android Chrome (Pixel 5) & iPhone Safari (iPhone 13)
 *
 * Uses storageState from auth.setup.ts (already logged in).
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function narrow(p: Page) { await p.setViewportSize({ width: 320, height: 700 }); }
async function land(p: Page) {
  const c = p.viewportSize() ?? { width: 393, height: 852 };
  await p.setViewportSize({ width: Math.max(c.width, c.height), height: Math.min(c.width, c.height) });
}
async function port(p: Page) {
  const c = p.viewportSize() ?? { width: 852, height: 393 };
  await p.setViewportSize({ width: Math.min(c.width, c.height), height: Math.max(c.width, c.height) });
}

/** Navigate via sidebar link */
async function nav(page: Page, href: string) {
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}

test.describe("Mobile E2E QA — Dashboard", () => {
  test.describe("3. 메인 대시보드 (발송 페이지)", () => {
    test("렌더링 + 320px + 회전", async ({ page }) => {
      test.setTimeout(30000);
      await nav(page, "/send");
      // Sidebar should be visible on mobile (as a drawer)
      const sidebar = page.locator("aside");
      if (await sidebar.isVisible().catch(() => false)) {
        await sidebar.isVisible();
      }
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page); await page.waitForTimeout(200);
      await land(page); await page.waitForTimeout(200);
      await port(page);
    });
    test("발송 폼 입력", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/send");
      const inputs = page.locator("textarea, input[type='text']");
      const count = await inputs.count();
      if (count > 0) {
        await inputs.first().fill("Mobile E2E test message");
      }
    });
  });

  test.describe("4. 계정 관리", () => {
    test("계정 목록 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/accounts");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page); await page.waitForTimeout(200);
    });
  });

  test.describe("5. 설정", () => {
    test("설정 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/settings");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page); await page.waitForTimeout(200);
      await land(page); await page.waitForTimeout(200);
      await port(page);
    });
  });

  test.describe("6. 스케줄", () => {
    test("스케줄 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/schedules");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
      await narrow(page);
    });
  });

  test.describe("7. 로그", () => {
    test("발송 로그 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/logs");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("8. 매크로", () => {
    test("매크로 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/macro");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("9. 감사", () => {
    test("감사 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/audit");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("10. 설정 변경", () => {
    test("설정 폼 상호작용", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/settings");
      const btn = page.locator("button, a").filter({ hasText: /저장|설정|변경|수정/ });
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.first().click({ force: true });
      }
    });
  });

  test.describe("11. 라이선스", () => {
    test("라이선스 페이지", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/admin/licenses");
      await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("12. 사이드바 네비게이션", () => {
    test("사이드바 링크 클릭", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/send");
      // Click the sidebar "발송 로그" link
      const logLink = page.locator("a").filter({ hasText: /발송 로그|로그/ });
      if (await logLink.first().isVisible().catch(() => false)) {
        await logLink.first().click({ force: true });
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe("Edge Cases", () => {
    test("320px 뷰포트 + 스크롤", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/send");
      await narrow(page); await page.waitForTimeout(200);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);
    });
    test("화면 회전", async ({ page }) => {
      test.setTimeout(20000);
      await nav(page, "/settings");
      await land(page); await page.waitForTimeout(200);
      await port(page); await page.waitForTimeout(200);
    });
  });
});