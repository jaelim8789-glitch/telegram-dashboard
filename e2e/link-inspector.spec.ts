import { expect, test } from "@playwright/test";
import { createAccount, deleteAccount, uniquePhone } from "./helpers";

/**
 * Covers the Bulk Link Inspector UI and its real (unmocked) API error path for an
 * account with no Telegram session — the same "reachable without live Telegram
 * credentials" boundary documented in accounts.spec.ts/broadcast.spec.ts. Inspecting
 * a real public link requires a configured TELEGRAM_API_ID/HASH + authenticated
 * session, which this repo's default .env deliberately doesn't ship.
 */
test.describe("벌크 링크 검사 (Bulk Link Inspector)", () => {
  let accountId: string;

  test.beforeEach(async ({ request }) => {
    accountId = await createAccount(request, uniquePhone(), "E2E 링크 검사 테스트 계정");
  });

  test.afterEach(async ({ request }) => {
    await deleteAccount(request, accountId);
  });

  test("링크를 붙여넣기 전에는 검사하기 버튼이 비활성화된다", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "링크 검사", exact: true }).click();

    const inspectButton = page.getByRole("button", { name: "검사하기" });
    await expect(inspectButton).toBeDisabled();

    await page.getByPlaceholder(/example1/).fill("https://t.me/example1\nhttps://t.me/example2");
    await expect(inspectButton).toBeEnabled();
    await expect(page.getByText("2개 붙여넣음")).toBeVisible();
  });

  test("붙여넣은 링크 중 중복이 있으면 고유 개수가 함께 표시된다", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "링크 검사", exact: true }).click();

    await page.getByPlaceholder(/example1/).fill("@example1,@example1,@example2");
    await expect(page.getByText("3개 붙여넣음 (고유 2개)")).toBeVisible();
  });

  test("인증되지 않은 계정으로 검사하면 세션 오류가 화면에 표시된다", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "링크 검사", exact: true }).click();

    await page.getByPlaceholder(/example1/).fill("https://t.me/example1");
    await page.getByRole("button", { name: "검사하기" }).click();

    await expect(page.getByText(/인증되지 않았습니다|텔레그램 세션이 만료/)).toBeVisible({ timeout: 10000 });
  });
});
