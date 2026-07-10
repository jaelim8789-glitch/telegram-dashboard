import { expect, test as setup } from "@playwright/test";

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "123123";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "123456";
const AUTH_FILE = "e2e/.auth/admin.json";

setup("관리자로 로그인해 세션을 저장해둔다", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("아이디").fill(ADMIN_USERNAME);
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();

  await page.waitForURL("/app");
  await expect(page.getByText(/^계정 목록 \(\d+\)$/)).toBeVisible();
  await expect(page.getByText(/^계정 목록 \(\d+\)$/)).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
