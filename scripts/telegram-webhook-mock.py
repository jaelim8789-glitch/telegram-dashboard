#!/usr/bin/env python3
"""
telegram-webhook-mock.py — 로컬 Telegram Bot Webhook Mock 서버

Telegram이 보내는 webhook 요청(update)을 로컬에서 시뮬레이션합니다.
ngrok 없이 로컬 FastAPI에 직접 POST 전송 가능.

Usage:
  python scripts/telegram-webhook-mock.py --help
  python scripts/telegram-webhook-mock.py --send-message "hello" --chat-id 12345
  python scripts/telegram-webhook-mock.py --interactive
"""

import argparse
import json
import time
import urllib.request

BASE_URL = "http://localhost:8000"

def send_update(webhook_url: str, update: dict):
    data = json.dumps(update).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)


def make_message_update(chat_id: int, text: str) -> dict:
    return {
        "update_id": int(time.time() * 1000) % 10**10,
        "message": {
            "message_id": 1,
            "date": int(time.time()),
            "chat": {"id": chat_id, "type": "private", "first_name": "Test"},
            "from": {"id": 123456, "is_bot": False, "first_name": "Tester"},
            "text": text,
        },
    }


def make_callback_update(chat_id: int, callback_data: str) -> dict:
    return {
        "update_id": int(time.time() * 1000) % 10**10,
        "callback_query": {
            "id": "12345",
            "from": {"id": 123456, "is_bot": False, "first_name": "Tester"},
            "message": {
                "message_id": 1,
                "date": int(time.time()),
                "chat": {"id": chat_id, "type": "private"},
                "text": "Original message",
            },
            "data": callback_data,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="TeleMon Telegram Webhook Mock")
    parser.add_argument("--url", default=f"{BASE_URL}/api/telegram-webhook",
                        help="Target webhook URL (default: %(default)s)")
    parser.add_argument("--send-message", "-m", help="Send a text message update")
    parser.add_argument("--callback-data", "-c", help="Send a callback query update")
    parser.add_argument("--chat-id", type=int, default=99999, help="Chat ID (default: %(default)s)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")
    args = parser.parse_args()

    if args.interactive:
        print(f"🔌 Telegram Webhook Mock — interactive mode")
        print(f"   Target: {args.url}")
        print(f"   Commands: /msg <text>, /cb <data>, /quit")
        while True:
            try:
                cmd = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if not cmd or cmd == "/quit":
                break
            if cmd.startswith("/msg "):
                text = cmd[5:]
                update = make_message_update(args.chat_id, text)
                status, body = send_update(args.url, update)
                print(f"   → {status}: {body[:200]}")
            elif cmd.startswith("/cb "):
                data = cmd[4:]
                update = make_callback_update(args.chat_id, data)
                status, body = send_update(args.url, update)
                print(f"   → {status}: {body[:200]}")
            else:
                print("   Unknown command. Try: /msg hello, /cb btn_1")
        return

    if args.send_message:
        update = make_message_update(args.chat_id, args.send_message)
    elif args.callback_data:
        update = make_callback_update(args.chat_id, args.callback_data)
    else:
        parser.print_help()
        return

    status, body = send_update(args.url, update)
    print(f"[{status}] {body[:500]}")


if __name__ == "__main__":
    main()
