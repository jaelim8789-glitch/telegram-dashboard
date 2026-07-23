// Sentry build config — used by @sentry/nextjs at build time
// Requires SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN in .env

import type { SentryBuildOptions } from "@sentry/nextjs";

const config: SentryBuildOptions = {
  org: process.env.SENTRY_ORG || "",
  project: process.env.SENTRY_PROJECT || "",
  authToken: process.env.SENTRY_AUTH_TOKEN || "",
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default config;
