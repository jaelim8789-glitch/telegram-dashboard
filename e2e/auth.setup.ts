import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getAdminToken } from "./helpers";

const AUTH_FILE = "e2e/.auth/admin.json";

setup("admin auth bootstrap", async ({ page, request }) => {
  const token = await getAdminToken(request);

  await page.goto("/");
  await page.evaluate((adminToken) => {
    localStorage.setItem("admin_token", adminToken);
    localStorage.setItem("session_token", adminToken);
  }, token);

  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
