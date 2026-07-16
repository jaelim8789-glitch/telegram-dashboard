"""
Thin async wrapper around the Telegram Bot API (HTTPS, not MTProto/Telethon).

Only the handful of methods the bot module needs are implemented.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_API_BASE = "https://api.telegram.org/bot{token}/{method}"


class TelegramAPIError(Exception):
    def __init__(self, method: str, description: str, error_code: int | None = None) -> None:
        super().__init__(f"{method} failed ({error_code}): {description}")
        self.method = method
        self.description = description
        self.error_code = error_code


class TelegramBotClient:
    """Stateless-ish client — one instance per bot token."""

    def __init__(self, bot_token: str, timeout: float = 10.0) -> None:
        self._token = bot_token
        self._timeout = timeout

    async def _call(self, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        url = _API_BASE.format(token=self._token, method=method)
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(url, json=payload or {})
        data = resp.json()
        if not data.get("ok"):
            raise TelegramAPIError(
                method,
                data.get("description", "unknown error"),
                data.get("error_code"),
            )
        return data["result"]

    async def send_message(
        self,
        chat_id: int | str,
        text: str,
        reply_markup: dict[str, Any] | None = None,
        parse_mode: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        if parse_mode:
            payload["parse_mode"] = parse_mode
        return await self._call("sendMessage", payload)

    async def answer_callback_query(
        self, callback_query_id: str, text: str | None = None, show_alert: bool = False
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"callback_query_id": callback_query_id, "show_alert": show_alert}
        if text:
            payload["text"] = text
        return await self._call("answerCallbackQuery", payload)

    async def get_chat_member(self, chat_id: int | str, user_id: int) -> dict[str, Any]:
        return await self._call("getChatMember", {"chat_id": chat_id, "user_id": user_id})

    async def set_webhook(self, url: str, secret_token: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"url": url, "allowed_updates": ["message", "callback_query"]}
        if secret_token:
            payload["secret_token"] = secret_token
        return await self._call("setWebhook", payload)

    async def delete_webhook(self) -> dict[str, Any]:
        return await self._call("deleteWebhook", {})

    async def get_webhook_info(self) -> dict[str, Any]:
        return await self._call("getWebhookInfo", {})


_CHANNEL_MEMBER_STATUSES = {"creator", "administrator", "member"}


def is_channel_member_status(status: str) -> bool:
    return status in _CHANNEL_MEMBER_STATUSES
