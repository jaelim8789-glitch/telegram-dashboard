import { expect, test } from "@playwright/test";
import { createAccount, createBroadcast, deleteAccount, uniquePhone } from "./helpers";

test.describe("발송 로그 조회 및 필터링", () => {
  let accountA: string;
  let accountB: string;

  test.beforeEach(async ({ request }) => {
    accountA = await createAccount(request, uniquePhone(), "E2E 로그 계정 A");
    accountB = await createAccount(request, uniquePhone(), "E2E 로그 계정 B");

    await createBroadcast(request, {
      accountId: accountA,
      message: "로그 테스트 A-1",
      recipients: ["-100111111"],
    });
    // Account B's send would otherwise be rate-limited against A within the same
    // minute — they're different accounts, so the cooldown is independent per account.
    await createBroadcast(request, {
      accountId: accountB,
      message: "로그 테스트 B-1",
      recipients: ["-100222222"],
    });
  });

  test.afterEach(async ({ request }) => {
    await deleteAccount(request, accountA);
    await deleteAccount(request, accountB);
  });

  test("전체 로그에 두 계정의 발송 기록이 모두 표시된다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "로그", exact: true }).click();

    await expect(page.getByText("로그 테스트 A-1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("로그 테스트 B-1")).toBeVisible();
  });

  test("계정 필터를 선택하면 해당 계정의 로그만 표시된다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "로그", exact: true }).click();
    await expect(page.getByText("로그 테스트 A-1")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("계정 필터").selectOption(accountA);

    await expect(page.getByText("로그 테스트 A-1")).toBeVisible();
    await expect(page.getByText("로그 테스트 B-1")).not.toBeVisible();
  });

  test("상태 필터로 완료(sent) 로그만 보면 아직 실제 발송된 건이 없어 결과가 비어 있다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "로그", exact: true }).click();
    await expect(page.getByText("로그 테스트 A-1")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("상태 필터").selectOption("sent");

    await expect(page.getByText("조건에 맞는 발송 로그가 없습니다.")).toBeVisible();
  });

  test("상태 필터로 실패 건을 보면 워커가 처리를 마친 두 건이 모두 표시된다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "로그", exact: true }).click();

    // Give the worker a moment to pick both jobs up and mark them failed (no real
    // Telegram session exists for either test account).
    await expect(page.getByText("로그 테스트 A-1")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "새로고침" }).click();

    await page.getByLabel("상태 필터").selectOption("failed");
    await expect(page.getByText("로그 테스트 A-1")).toBeVisible();
    await expect(page.getByText("로그 테스트 B-1")).toBeVisible();
  });
});
