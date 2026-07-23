import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || "production",
      tracesSampleRate: 0.1,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Send error alerts to Slack via Sentry's webhook integration.
      // Configure in Sentry UI: Settings → Integrations → Webhook → Add
      // URL = ALERT_WEBHOOK_URL env var value (Slack/Discord compatible)
      integrations: [
        Sentry.dedupeIntegration(),
      ],
    });
  }
}
