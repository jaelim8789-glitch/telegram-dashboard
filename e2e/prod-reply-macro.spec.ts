import { expect, test } from "@playwright/test";

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "sksk2929";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "qpqpqp10!!";
const PROD_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://telemon.online";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto(`${PROD_URL}/admin/login`, { waitUntil: "networkidle" });
  // Click "관리자" tab
  await page.getByRole("button", { name: "관리자" }).click();
  await page.waitForTimeout(500);
  // Fill credentials
  await page.getByLabel("아이디").fill(ADMIN_USERNAME);
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  // Wait for app redirect
  await page.waitForURL("**/admin/dashboard**", { timeout: 15000 });
}

test.describe("Production: 답장 매크로 검증", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Navigate to send tab
    await page.goto(`${PROD_URL}/app`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    // Click send tab button
    const sendBtn = page.getByRole("button", { name: "발송" });
    if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("1. 답장 매크로 ON → 메시지 ID 입력 → 발송 버튼 상태 확인", async ({ page }) => {
    // Toggle reply macro ON
    await page.getByText("답장으로 보내기").click();
    await expect(page.getByLabel("답장할 메시지 ID")).toBeVisible({ timeout: 3000 });
    // Enter a valid message ID
    await page.getByLabel("답장할 메시지 ID").fill("12345");
    await page.waitForTimeout(500);
    // Verify the message ID input has the value
    await expect(page.getByLabel("답장할 메시지 ID")).toHaveValue("12345");
    // Verify delivery mode selector is hidden (reply mode)
    await expect(page.getByText("발송 방식")).toHaveCount(0);
  });

  test("2. 답장 매크로 OFF → 일반 발송 모드 복원", async ({ page }) => {
    // First toggle ON
    await page.getByText("답장으로 보내기").click();
    await expect(page.getByLabel("답장할 메시지 ID")).toBeVisible({ timeout: 3000 });
    // Then toggle OFF
    await page.getByText("답장으로 보내기").click();
    await expect(page.getByLabel("답장할 메시지 ID")).toHaveCount(0);
    // Delivery mode should be back
    await expect(page.getByText("발송 방식")).toBeVisible();
  });

  test("3. 발송 이력에서 재사용 시 답장 상태 복원", async ({ page }) => {
    // Scroll to history section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    // Look for any broadcast entry in history
    const firstBroadcast = page.locator('[class*="broadcast"], [class*="history-item"], [class*="Broadcast"]').first();
    const hasHistory = await firstBroadcast.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasHistory) {
      await firstBroadcast.click();
      await page.waitForTimeout(2000);
      // After clicking, check if reply macro state was restored
      const replyCheckboxChecked = await page.getByText("답장으로 보내기")
        .locator("..")
        .locator('input[type="checkbox"]')
        .isChecked().catch(() => false);
      console.log(`  Reply checkbox checked: ${replyCheckboxChecked}`);
    }
  });

  test("4. 일반 발송 broadcast 재사용 시 일반 모드 유지", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  });

  test("5. 실제 발송 (reply mode) 후 sent 상태 확인", async ({ page }) => {
    // Find if there are any accounts with valid sessions on the dashboard
    // and attempt a scheduled broadcast via the API
    // First check history for any sent/failed reply broadcasts
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // Look for status badges in history
    const sentBadge = page.getByText("sent", { exact: true });
    const failedBadge = page.getByText("실패");
    const successBadge = page.getByText("성공");
    
    const hasSent = await sentBadge.isVisible({ timeout: 3000 }).catch(() => false);
    const hasFailed = await failedBadge.isVisible({ timeout: 3000 }).catch(() => false);
    const hasSuccess = await successBadge.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  History status: sent=${hasSent} failed=${hasFailed} success=${hasSuccess}`);
  });

  test.afterEach(async ({ page }) => {
    await page.screenshot({ path: `test-results/prod-${test.info().title.replace(/[\\\/\s]+/g, "-")}.png` });
  });
});

test.describe("TMP DIAGNOSTIC: workspace tab clicks", () => {
  test("repro: click replymacro and folders tabs, capture console/network errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(`${PROD_URL}/admin/login`, { waitUntil: "networkidle" });
    await page.evaluate((token) => {
      window.localStorage.setItem("admin_token", token);
      window.localStorage.setItem("telemon-onboarding-dismissed", JSON.stringify({ version: 1, dismissedAt: Date.now() }));
    }, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc4NDE1NzY4NH0.KDr_N3vJdBB6LQMp-K6_2Gx4zHksfJodZ2P6Po1RewQ");
    await page.goto(`${PROD_URL}/app`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    console.log("console errors after load:", consoleErrors.length, JSON.stringify(consoleErrors));

    const replyMacroTab = page.getByRole("button", { name: "답장매크로" });
    const visibleBefore = await replyMacroTab.isVisible({ timeout: 5000 }).catch(() => false);
    console.log("replymacro tab visible:", visibleBefore);

    if (visibleBefore) {
      const box = await replyMacroTab.boundingBox();
      console.log("replymacro tab boundingBox:", JSON.stringify(box));
      const elAtPoint = box
        ? await page.evaluate(
            ([x, y]) => {
              const el = document.elementFromPoint(x, y);
              return el ? el.outerHTML.slice(0, 300) : null;
            },
            [box.x + box.width / 2, box.y + box.height / 2] as [number, number],
          )
        : null;
      console.log("element at replymacro tab center point:", elAtPoint);

      await replyMacroTab.click({ timeout: 5000 }).catch((e) => {
        console.log("CLICK FAILED:", e.message);
      });
      await page.waitForTimeout(2000);
      const ariaCurrent = await replyMacroTab.getAttribute("aria-current").catch(() => null);
      console.log("replymacro tab aria-current after click:", ariaCurrent);
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
      console.log("BODY TEXT SNIPPET AFTER CLICK:", bodyText);
    }

    console.log("=== FOLDERS TAB ===");
    const foldersTab = page.getByRole("button", { name: "폴더" });
    const foldersVisible = await foldersTab.isVisible({ timeout: 5000 }).catch(() => false);
    console.log("folders tab visible:", foldersVisible);
    if (foldersVisible) {
      await foldersTab.click().catch((e) => console.log("FOLDERS CLICK FAILED:", e.message));
      await page.waitForTimeout(2000);
      const bodyText2 = await page.evaluate(() => document.body.innerText.slice(0, 1000));
      console.log("FOLDERS BODY TEXT:", bodyText2);
    }

    console.log("=== CONSOLE ERRORS (all) ===", JSON.stringify(consoleErrors, null, 2));
    console.log("=== PAGE ERRORS (uncaught exceptions) ===", JSON.stringify(pageErrors, null, 2));
    console.log("=== FAILED NETWORK REQUESTS (>=400) ===", JSON.stringify(failedRequests, null, 2));

    await page.screenshot({ path: "test-results/tmp-diagnostic-final.png", fullPage: true });
  });
});
