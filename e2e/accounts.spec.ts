import { expect, test } from "@playwright/test";
import { deleteAccount, fetchAccountByPhone, uniquePhone } from "./helpers";

/**
 * Covers registration -> the code-entry step of Telegram auth -> the account row
 * persisting in Postgres. It stops short of an actual SMS code: that requires a real
 * phone number and a configured TELEGRAM_API_ID/HASH, which this repo's default .env
 * deliberately doesn't ship (see README "알려진 한계"). What's fully exercised here —
 * account creation, the wizard's step transition, and persistence across a reload — is
 * everything that's true regardless of whether real Telegram credentials are configured.
 */
test.describe("계정 등록 → 인증 단계 진입 → 세션 영속성", () => {
  let accountIdToClean: string | null = null;

  test.afterEach(async ({ request }) => {
    if (accountIdToClean) {
      await deleteAccount(request, accountIdToClean);
      accountIdToClean = null;
    }
  });

  test("전화번호 등록 시 사이드바에 즉시 반영되고 인증번호 입력 단계로 진입한다", async ({ page, request }) => {
    const phone = uniquePhone();

    await page.goto("/");
    await expect(page.getByText(/^계정 목록 \(\d+\)$/)).toBeVisible();

    await page.getByPlaceholder("+82 10-0000-0000").fill(phone);
    await page.getByPlaceholder("예: 연구용 계정 A").fill("E2E 계정 등록 테스트");
    await page.getByRole("button", { name: "계정 등록 및 인증번호 요청" }).click();

    await expect(page.getByText(phone).first()).toBeVisible();
    await expect(page.getByText("인증번호 입력")).toBeVisible();

    const match = await fetchAccountByPhone(request, phone);
    expect(match).toBeTruthy();
    expect(match?.status).toBe("inactive");
    accountIdToClean = match?.id ?? null;
  });

  test("Telegram API 자격증명이 없으면 인증번호 요청 실패가 화면에 표시되고, 재전송으로 재시도할 수 있다", async ({
    page,
    request,
  }) => {
    const phone = uniquePhone();

    await page.goto("/");
    await page.getByPlaceholder("+82 10-0000-0000").fill(phone);
    await page.getByRole("button", { name: "계정 등록 및 인증번호 요청" }).click();

    await expect(page.getByText(/TELEGRAM_API_ID|my\.telegram\.org/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "인증번호 재전송" }).click();
    await expect(page.getByText(/TELEGRAM_API_ID|my\.telegram\.org/)).toBeVisible();

    const match = await fetchAccountByPhone(request, phone);
    accountIdToClean = match?.id ?? null;
  });

  test("등록된 계정은 새로고침 후에도 유지된다 (Postgres 영속성)", async ({ page, request }) => {
    const phone = uniquePhone();

    await page.goto("/");
    await page.getByPlaceholder("+82 10-0000-0000").fill(phone);
    await page.getByRole("button", { name: "계정 등록 및 인증번호 요청" }).click();
    await expect(page.getByText(phone).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText(phone).first()).toBeVisible();

    const match = await fetchAccountByPhone(request, phone);
    accountIdToClean = match?.id ?? null;
  });
});
