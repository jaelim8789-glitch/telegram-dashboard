# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> admin auth bootstrap
- Location: e2e\auth.setup.ts:8:6

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost/
Call log:
  - navigating to "http://localhost/", waiting until "load"

```

# Test source

```ts
  1  | import { test as setup } from "@playwright/test";
  2  | import { mkdirSync } from "node:fs";
  3  | import { dirname } from "node:path";
  4  | import { getAdminToken } from "./helpers";
  5  | 
  6  | const AUTH_FILE = "e2e/.auth/admin.json";
  7  | 
  8  | setup("admin auth bootstrap", async ({ page, request }) => {
  9  |   const token = await getAdminToken(request);
  10 | 
> 11 |   await page.goto("/");
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost/
  12 |   await page.evaluate((adminToken) => {
  13 |     localStorage.setItem("admin_token", adminToken);
  14 |     localStorage.setItem("session_token", adminToken);
  15 |   }, token);
  16 | 
  17 |   mkdirSync(dirname(AUTH_FILE), { recursive: true });
  18 |   await page.context().storageState({ path: AUTH_FILE });
  19 | });
  20 | 
```