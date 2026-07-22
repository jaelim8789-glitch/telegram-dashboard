# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prod-reply-macro.spec.ts >> Production: 답장 매크로 검증 >> 5. 실제 발송 (reply mode) 후 sent 상태 확인
- Location: e2e\prod-reply-macro.spec.ts:82:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/admin/dashboard**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: TM
      - heading "TeleMon" [level=1] [ref=e6]
      - paragraph [ref=e7]: 텔레그램 자동화 대시보드
    - generic [ref=e8]:
      - button "무료체험" [ref=e9]:
        - img [ref=e10]
        - generic [ref=e13]: 무료체험
      - button "API 키" [ref=e14]:
        - img [ref=e15]
        - generic [ref=e18]: API 키
      - button "관리자" [ref=e19]:
        - img [ref=e20]
        - generic [ref=e23]: 관리자
    - generic [ref=e24]:
      - generic [ref=e25]:
        - heading "관리자 로그인" [level=2] [ref=e26]
        - paragraph [ref=e27]: 아이디와 비밀번호로 로그인
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: 아이디
          - textbox "아이디" [ref=e31]: sksk2929
        - generic [ref=e32]:
          - generic [ref=e33]: 비밀번호
          - textbox "비밀번호" [ref=e34]: qpqpqp10!!
        - alert [ref=e35]:
          - img [ref=e36]
          - paragraph [ref=e41]: 아이디 또는 비밀번호가 올바르지 않습니다.
        - button "로그인" [ref=e42]
    - paragraph [ref=e43]:
      - text: 아직 API 키가 없으신가요?
      - link "USDT로 발급받기" [ref=e44] [cursor=pointer]:
        - /url: /get-api-key
  - generic "Notifications"
  - alert [ref=e45]
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "sksk2929";
  4   | const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "qpqpqp10!!";
  5   | const PROD_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://telemon.online";
  6   | 
  7   | async function loginAsAdmin(page: import("@playwright/test").Page) {
  8   |   await page.goto(`${PROD_URL}/admin/login`, { waitUntil: "networkidle" });
  9   |   // Click "관리자" tab
  10  |   await page.getByRole("button", { name: "관리자" }).click();
  11  |   await page.waitForTimeout(500);
  12  |   // Fill credentials
  13  |   await page.getByLabel("아이디").fill(ADMIN_USERNAME);
  14  |   await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  15  |   await page.getByRole("button", { name: "로그인" }).click();
  16  |   // Wait for app redirect
> 17  |   await page.waitForURL("**/admin/dashboard**", { timeout: 15000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  18  | }
  19  | 
  20  | test.describe("Production: 답장 매크로 검증", () => {
  21  |   test.beforeEach(async ({ page }) => {
  22  |     await loginAsAdmin(page);
  23  |     // Navigate to send tab
  24  |     await page.goto(`${PROD_URL}/app`, { waitUntil: "networkidle" });
  25  |     await page.waitForTimeout(2000);
  26  |     // Click send tab button
  27  |     const sendBtn = page.getByRole("button", { name: "발송" });
  28  |     if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  29  |       await sendBtn.click();
  30  |       await page.waitForTimeout(1000);
  31  |     }
  32  |   });
  33  | 
  34  |   test("1. 답장 매크로 ON → 메시지 ID 입력 → 발송 버튼 상태 확인", async ({ page }) => {
  35  |     // Toggle reply macro ON
  36  |     await page.getByText("답장으로 보내기").click();
  37  |     await expect(page.getByLabel("답장할 메시지 ID")).toBeVisible({ timeout: 3000 });
  38  |     // Enter a valid message ID
  39  |     await page.getByLabel("답장할 메시지 ID").fill("12345");
  40  |     await page.waitForTimeout(500);
  41  |     // Verify the message ID input has the value
  42  |     await expect(page.getByLabel("답장할 메시지 ID")).toHaveValue("12345");
  43  |     // Verify delivery mode selector is hidden (reply mode)
  44  |     await expect(page.getByText("발송 방식")).toHaveCount(0);
  45  |   });
  46  | 
  47  |   test("2. 답장 매크로 OFF → 일반 발송 모드 복원", async ({ page }) => {
  48  |     // First toggle ON
  49  |     await page.getByText("답장으로 보내기").click();
  50  |     await expect(page.getByLabel("답장할 메시지 ID")).toBeVisible({ timeout: 3000 });
  51  |     // Then toggle OFF
  52  |     await page.getByText("답장으로 보내기").click();
  53  |     await expect(page.getByLabel("답장할 메시지 ID")).toHaveCount(0);
  54  |     // Delivery mode should be back
  55  |     await expect(page.getByText("발송 방식")).toBeVisible();
  56  |   });
  57  | 
  58  |   test("3. 발송 이력에서 재사용 시 답장 상태 복원", async ({ page }) => {
  59  |     // Scroll to history section
  60  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  61  |     await page.waitForTimeout(1000);
  62  |     // Look for any broadcast entry in history
  63  |     const firstBroadcast = page.locator('[class*="broadcast"], [class*="history-item"], [class*="Broadcast"]').first();
  64  |     const hasHistory = await firstBroadcast.isVisible({ timeout: 5000 }).catch(() => false);
  65  |     if (hasHistory) {
  66  |       await firstBroadcast.click();
  67  |       await page.waitForTimeout(2000);
  68  |       // After clicking, check if reply macro state was restored
  69  |       const replyCheckboxChecked = await page.getByText("답장으로 보내기")
  70  |         .locator("..")
  71  |         .locator('input[type="checkbox"]')
  72  |         .isChecked().catch(() => false);
  73  |       console.log(`  Reply checkbox checked: ${replyCheckboxChecked}`);
  74  |     }
  75  |   });
  76  | 
  77  |   test("4. 일반 발송 broadcast 재사용 시 일반 모드 유지", async ({ page }) => {
  78  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  79  |     await page.waitForTimeout(1000);
  80  |   });
  81  | 
  82  |   test("5. 실제 발송 (reply mode) 후 sent 상태 확인", async ({ page }) => {
  83  |     // Find if there are any accounts with valid sessions on the dashboard
  84  |     // and attempt a scheduled broadcast via the API
  85  |     // First check history for any sent/failed reply broadcasts
  86  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  87  |     await page.waitForTimeout(2000);
  88  |     
  89  |     // Look for status badges in history
  90  |     const sentBadge = page.getByText("sent", { exact: true });
  91  |     const failedBadge = page.getByText("실패");
  92  |     const successBadge = page.getByText("성공");
  93  |     
  94  |     const hasSent = await sentBadge.isVisible({ timeout: 3000 }).catch(() => false);
  95  |     const hasFailed = await failedBadge.isVisible({ timeout: 3000 }).catch(() => false);
  96  |     const hasSuccess = await successBadge.isVisible({ timeout: 3000 }).catch(() => false);
  97  |     console.log(`  History status: sent=${hasSent} failed=${hasFailed} success=${hasSuccess}`);
  98  |   });
  99  | 
  100 |   test.afterEach(async ({ page }) => {
  101 |     await page.screenshot({ path: `test-results/prod-${test.info().title.replace(/[\\\/\s]+/g, "-")}.png` });
  102 |   });
  103 | });
  104 | 
```