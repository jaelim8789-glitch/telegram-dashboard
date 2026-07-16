"""
One-shot helper to register (or clear) the Telegram bot webhook.

Run manually after you have a public HTTPS URL for the deployed API:

    TELEGRAM_BOT_TOKEN=... TELEGRAM_BOT_WEBHOOK_SECRET=... \
        python scripts/register_telegram_webhook.py set https://your-domain.com/api/bot/webhook

    python scripts/register_telegram_webhook.py info
    python scripts/register_telegram_webhook.py delete

This is intentionally not called automatically on app startup — webhook
registration is a one-time operation tied to your public domain, not
something that should run (and hit Telegram's API) on every restart.
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.bot.telegram_api import TelegramBotClient  # noqa: E402


async def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        print("TELEGRAM_BOT_TOKEN is required")
        raise SystemExit(1)

    client = TelegramBotClient(token)
    action = sys.argv[1] if len(sys.argv) > 1 else "info"

    if action == "set":
        if len(sys.argv) < 3:
            print("Usage: register_telegram_webhook.py set <https-url>")
            raise SystemExit(1)
        url = sys.argv[2]
        secret = os.environ.get("TELEGRAM_BOT_WEBHOOK_SECRET", "")
        result = await client.set_webhook(url, secret_token=secret or None)
        print("setWebhook:", result)
    elif action == "delete":
        result = await client.delete_webhook()
        print("deleteWebhook:", result)
    else:
        result = await client.get_webhook_info()
        print("getWebhookInfo:", result)


if __name__ == "__main__":
    asyncio.run(main())
