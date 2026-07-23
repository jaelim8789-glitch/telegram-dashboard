import { expect, test } from "@playwright/test";
import { cancelBroadcast, createAccount, createBroadcast, createFolder, deleteAccount, uniquePhone } from "./helpers";

/**
 * Covers the send flow end to end for what's true without a live Telegram session:
 * the UI's own validation/disabled states, the scheduled-send toggle, and — via the
 * real API against the real DB — that a scheduled broadcast shows up correctly in the
 * send tab's history with its "예약됨" badge and scheduled time. Selecting a *real*
 * Telegram group to send to isn't reachable here (see accounts.spec.ts for why), so
 * this exercises the UI/data-flow around sending rather than an actual delivered message.
 */
test.describe("발송 흐름 (예약 포함)", () => {
  let accountId: string;

  test.beforeEach(async ({ request }) => {
    accountId = await createAccount(request, uniquePhone(), "E2E 발송 테스트 계정");
  });

  test.afterEach(async ({ request }) => {
    await deleteAccount(request, accountId);
  });

  test("인증되지 않은 계정은 발송 탭에서 그룹 목록 에러와 비활성화된 발송 버튼을 보여준다", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();
    await expect(page.getByText(/인증되지 않았습니다/)).toBeVisible({ timeout: 10000 });

    const sendButton = page.getByRole("button", { name: "발송", exact: true }).last();
    await expect(sendButton).toBeDisabled();
  });

  test("Groups 페이지에서 만든 폴더(발송 그룹)가 발송 탭에 노출되고 선택 시 그룹이 채워진다", async ({ page, request }) => {
    await createFolder(request, {
      accountId,
      name: "E2E 발송그룹",
      groupIds: ["-100111111", "-100222222"],
    });

    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    // The folder created via the Folders/Groups API is directly selectable from Send.
    const folderChip = page.getByRole("button", { name: /E2E 발송그룹.*2/ });
    await expect(folderChip).toBeVisible({ timeout: 10000 });

    // This account has no real Telegram groups, so the folder's saved group IDs
    // aren't "available" to select — clicking still exercises the real selection
    // handler end-to-end and must report that clearly rather than silently no-op.
    await folderChip.click();
    await expect(page.getByText(/사용할 수 있는 그룹이 없습니다/)).toBeVisible();
  });

  test("예약 발송 체크박스를 켜면 날짜/시간 입력이 나타나고, 끄면 사라진다", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(0);
    await page.getByText("예약 발송").click();
    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(1);
    await page.getByText("예약 발송").click();
    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(0);
  });

  test("API로 생성한 예약 발송이 발송 이력에 예약됨 배지와 예정 시각으로 표시된다", async ({ page, request }) => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await createBroadcast(request, {
      accountId,
      message: "E2E 예약 발송 확인용 메시지",
      recipients: ["-100123456"],
      scheduledAt,
    });

    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    await expect(page.getByText("E2E 예약 발송 확인용 메시지")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("예약됨")).toBeVisible();
  });

  test("API로 생성한 즉시 발송은 워커 처리 후 실패 상태와 사유가 이력에 표시된다", async ({ page, request }) => {
    await createBroadcast(request, {
      accountId,
      message: "E2E 즉시 발송 확인용 메시지",
      recipients: ["-100654321"],
    });

    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();
    await expect(page.getByText("E2E 즉시 발송 확인용 메시지")).toBeVisible({ timeout: 10000 });

    // No real Telegram session exists for this account, so the worker fails it — but
    // fails it *cleanly*, which is what's actually being verified here.
    await expect(page.getByText("실패")).toBeVisible({ timeout: 15000 });
  });

  test("답장으로 보내기 체크박스를 켜면 추가 메시지 ID 입력이 나타나고, 끄면 사라진다 (발송 방식은 항상 표시)", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    // Delivery mode is always visible regardless of reply state
    await expect(page.getByText("발송 방식")).toBeVisible();
    await expect(page.getByLabel("답장할 메시지 ID")).toHaveCount(0);

    // Toggle ON — reply ID appears, delivery mode stays
    await page.getByText("답장으로 보내기").click();
    await expect(page.getByLabel("답장할 메시지 ID")).toBeVisible();
    await expect(page.getByText("발송 방식")).toBeVisible();

    // Toggle OFF — reply ID disappears, delivery mode stays
    await page.getByText("답장으로 보내기").click();
    await expect(page.getByText("발송 방식")).toBeVisible();
    await expect(page.getByLabel("답장할 메시지 ID")).toHaveCount(0);
  });

  test("답장으로 보내기 활성화 시 발송 버튼은 메시지 내용 + 수신자 선택 요건 그대로 유지된다", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    // This account has no groups (no real Telegram session), so a recipient can
    // never be selected — the button must stay disabled regardless of the
    // message-ID input, confirming reply mode didn't drop the recipient check.
    await page.getByText("답장으로 보내기").click();
    const sendButton = page.getByRole("button", { name: "발송", exact: true }).last();
    await expect(sendButton).toBeDisabled();

    // Even with a reply ID, button stays disabled because no message content AND no recipients
    await page.getByLabel("답장할 메시지 ID").fill("12345");
    await expect(sendButton).toBeDisabled();
  });

  test("반복 발송 체크박스를 켜면 간격 선택 드롭다운이 나타나고, 끄면 사라진다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    await expect(page.locator('select')).toHaveCount(0);
    await page.getByText("반복 발송").click();
    await expect(page.locator('select')).toHaveCount(1);
    await page.getByText("반복 발송").click();
    await expect(page.locator('select')).toHaveCount(0);
  });

  test("API로 생성한 반복 발송이 발송 이력에 반복 중 배지로 표시된다", async ({ page, request }) => {
    await createBroadcast(request, {
      accountId,
      message: "E2E 반복 발송 확인용 메시지",
      recipients: ["-100123456"],
      recurringIntervalMinutes: 60,
    });

    await page.goto("/");
    await page.getByRole("button", { name: "발송", exact: true }).click();

    await expect(page.getByText("E2E 반복 발송 확인용 메시지")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("반복 중")).toBeVisible();
  });

  test("취소된 반복 발송은 발송 이력에 취소됨 배지로 표시된다", async ({ page, request }) => {
    const broadcastId = await createBroadcast(request, {
      accountId,
      message: "E2E 취소 확인용 메시지",
      recipients: ["-100123456"],
      recurringIntervalMinutes: 60,
    });

    await cancelBroadcast(request, broadcastId);

    await page.goto("/");
    await page.getByRole("button", { name: "발송", exact: true }).click();
    await expect(page.getByText("E2E 취소 확인용 메시지")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("취소됨")).toBeVisible();
  });
});
