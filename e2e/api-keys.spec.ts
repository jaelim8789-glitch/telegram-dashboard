import { expect, test } from "@playwright/test";

// Runs under the default "chromium" project — has a stored admin session already
// (see e2e/auth.setup.ts), so it can go straight to the API-key management page.
test.describe("API 키 관리 (로그인 상태)", () => {
  test("API 키를 발급하면 전체 값이 한 번 표시되고, 목록에는 마스킹되어 나온다", async ({ page }) => {
    await page.goto("/admin/api-keys");
    await expect(page.getByText("API 키 관리")).toBeVisible();

    const keyName = `E2E 테스트 키 ${Date.now()}`;
    await page.getByPlaceholder("예: 외부 연동용").fill(keyName);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/admin/api-keys") && res.request().method() === "POST"),
      page.getByRole("button", { name: "발급" }).click(),
    ]);
    const created = await response.json();

    await expect(page.getByText(/지금만 전체가 표시됩니다/)).toBeVisible();
    const fullKeyLocator = page.locator("code").filter({ hasText: /^sk-/ });
    await expect(fullKeyLocator.first()).toBeVisible();

    // data-testid keys the row on the API key's own id — robust against nested
    // elements that also happen to contain the same name text (e.g. the list's own
    // wrapping container), unlike a plain text-content filter.
    const row = page.getByTestId(`api-key-row-${created.id}`);
    await expect(row).toBeVisible();
    await expect(row.getByText(keyName)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "삭제" }).click();
    await expect(row).not.toBeVisible();
  });
});
