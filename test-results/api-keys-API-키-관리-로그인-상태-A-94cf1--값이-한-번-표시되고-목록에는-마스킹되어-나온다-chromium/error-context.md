# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-keys.spec.ts >> API 키 관리 (로그인 상태) >> API 키를 발급하면 전체 값이 한 번 표시되고, 목록에는 마스킹되어 나온다
- Location: e2e\api-keys.spec.ts:6:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('API 키 관리')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('API 키 관리')

```

```yaml
- text: TM
- heading "TeleMon" [level=1]
- paragraph: 텔레그램 자동화 대시보드
- button "무료체험"
- button "API 키"
- button "관리자"
- heading "관리자 로그인" [level=2]
- paragraph: 아이디와 비밀번호로 로그인
- text: 아이디
- textbox "아이디"
- text: 비밀번호
- textbox "비밀번호"
- button "로그인"
- paragraph:
  - text: 아직 API 키가 없으신가요?
  - link "USDT로 발급받기":
    - /url: /get-api-key
- alert
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | // Runs under the default "chromium" project — has a stored admin session already
  4  | // (see e2e/auth.setup.ts), so it can go straight to the API-key management page.
  5  | test.describe("API 키 관리 (로그인 상태)", () => {
  6  |   test("API 키를 발급하면 전체 값이 한 번 표시되고, 목록에는 마스킹되어 나온다", async ({ page }) => {
  7  |     await page.goto("/admin/api-keys");
> 8  |     await expect(page.getByText("API 키 관리")).toBeVisible();
     |                                              ^ Error: expect(locator).toBeVisible() failed
  9  | 
  10 |     const keyName = `E2E 테스트 키 ${Date.now()}`;
  11 |     await page.getByPlaceholder("예: 외부 연동용").fill(keyName);
  12 | 
  13 |     const [response] = await Promise.all([
  14 |       page.waitForResponse((res) => res.url().includes("/api/admin/api-keys") && res.request().method() === "POST"),
  15 |       page.getByRole("button", { name: "발급" }).click(),
  16 |     ]);
  17 |     const created = await response.json();
  18 | 
  19 |     await expect(page.getByText(/지금만 전체가 표시됩니다/)).toBeVisible();
  20 |     const fullKeyLocator = page.locator("code").filter({ hasText: /^sk-/ });
  21 |     await expect(fullKeyLocator.first()).toBeVisible();
  22 | 
  23 |     // data-testid keys the row on the API key's own id — robust against nested
  24 |     // elements that also happen to contain the same name text (e.g. the list's own
  25 |     // wrapping container), unlike a plain text-content filter.
  26 |     const row = page.getByTestId(`api-key-row-${created.id}`);
  27 |     await expect(row).toBeVisible();
  28 |     await expect(row.getByText(keyName)).toBeVisible();
  29 | 
  30 |     page.once("dialog", (dialog) => dialog.accept());
  31 |     await row.getByRole("button", { name: "삭제" }).click();
  32 |     await expect(row).not.toBeVisible();
  33 |   });
  34 | });
  35 | 
```