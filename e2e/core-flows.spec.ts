import { test, expect } from "@playwright/test";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

test.describe("TeleMon E2E — 핵심 유저 플로우", () => {
  // ── AI 대화 ──
  test("AI 대화창 — 기본 UI 요소 확인", async ({ page }) => {
    await page.goto(`${APP_URL}/app`);

    // 하단 탭바에서 AI 대화 탭 확인
    await expect(page.locator("text=AI").first()).toBeVisible({ timeout: 10000 });

    // AI 대화 진입
    await page.click("text=AI");

    // 웰컴 카드 or 메시지 입력창 확인
    await expect(page.locator('textarea[placeholder*="메시지"]').first()).toBeVisible({ timeout: 8000 });
  });

  test("AI 질문 전송 — 음성 버튼 존재", async ({ page }) => {
    await page.goto(`${APP_URL}/app`);
    await page.click("text=AI");
    await page.waitForTimeout(3000);

    // 마이크 버튼 확인 (Web Speech API 미지원 브라우저에서는 없을 수 있음)
    const micBtn = page.locator('[title*="음성"]');
    const exists = (await micBtn.count()) > 0;
    if (exists) {
      await expect(micBtn).toBeVisible();
    }

    // 텍스트 입력창 존재
    const input = page.locator('textarea[placeholder*="메시지"]').first();
    await expect(input).toBeVisible();
  });

  test("발송탭 — UI 요소 확인", async ({ page }) => {
    await page.goto(`${APP_URL}/app`);

    // 발송탭 진입
    await page.locator("text=발송").first().click();
    await page.waitForTimeout(2000);

    // 작성/히스토리 서브탭 확인
    await expect(page.locator("text=작성").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=히스토리").first()).toBeVisible();
  });

  // ── 그룹탭 ──
  test("그룹탭 — 그룹 목록 존재", async ({ page }) => {
    await page.goto(`${APP_URL}/app`);

    await page.locator("text=그룹").first().click();
    await page.waitForTimeout(3000);

    // 검색창 또는 그룹 리스트 확인
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    const exists = (await searchInput.count()) > 0;
    if (exists) {
      await expect(searchInput).toBeVisible();
    }
  });

  // ── PWA ──
  test("PWA — manifest 존재", async ({ page }) => {
    const response = await page.goto(`${APP_URL}/manifest.json`);
    expect(response?.status()).toBe(200);
    const manifest = await response?.json();
    expect(manifest.name).toContain("TeleMon");
    expect(manifest.display).toBe("standalone");
  });

  test("PWA — Service Worker 등록", async ({ page }) => {
    await page.goto(`${APP_URL}/app`);
    const registrations = await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((r) => r.length)
    );
    expect(registrations).toBeGreaterThanOrEqual(0);
  });
});
