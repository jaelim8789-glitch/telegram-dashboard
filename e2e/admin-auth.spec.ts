import { expect, test } from "@playwright/test";

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "123123";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "123456";

// Runs under the "chromium-no-auth" project (see playwright.config.ts) — no stored
// session, unlike every other spec — since it specifically tests the logged-out state.
test.describe("관리자 인증", () => {
  test("로그인하지 않고 메인 대시보드에 접속하면 로그인 페이지로 리다이렉트된다", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/admin\/login/);
    await expect(page.getByText("관리자 로그인")).toBeVisible();
  });

  test("잘못된 비밀번호로는 로그인에 실패한다", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("아이디").fill(ADMIN_USERNAME);
    await page.getByLabel("비밀번호").fill("완전히-틀린-비밀번호");
    await page.getByRole("button", { name: "로그인", exact: true }).click();

    await expect(page.getByText(/올바르지 않습니다/)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("올바른 자격증명으로 로그인하면 메인 대시보드로 이동한다", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("아이디").fill(ADMIN_USERNAME);
    await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();

    await page.waitForURL("/");
    await expect(page.getByText(/^계정 목록 \(\d+\)$/)).toBeVisible();
  });

  test("로그아웃하면 세션이 사라지고 다시 로그인 페이지로 이동한다", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("아이디").fill(ADMIN_USERNAME);
    await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.waitForURL("/");

    await page.getByTitle("로그아웃").click();
    await page.waitForURL(/\/admin\/login/);

    await page.goto("/");
    await page.waitForURL(/\/admin\/login/);
  });
});
