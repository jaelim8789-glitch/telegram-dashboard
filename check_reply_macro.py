import asyncio, json, os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://telegram_dashboard:telegram_dashboard@db:5432/telegram_dashboard"
os.environ["DB_HOST"] = "db"

# Workaround: we'll use psql instead to avoid import issues
import subprocess
cmd = "PGPASSWORD=telegram_dashboard psql -h db -U telegram_dashboard -d telegram_dashboard -c \"SELECT id, name, account_id, target_chats, is_active, last_sent_at FROM reply_macros ORDER BY created_at DESC LIMIT 5;\""
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("=== MACROS ===")
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr[:500])

cmd2 = "PGPASSWORD=telegram_dashboard psql -h db -U telegram_dashboard -d telegram_dashboard -c \"SELECT id, macro_id, target_chat_id, status, message_sent, created_at FROM reply_macro_logs ORDER BY created_at DESC LIMIT 10;\""
result2 = subprocess.run(cmd2, shell=True, capture_output=True, text=True)
print("=== LOGS ===")
print(result2.stdout)
if result2.stderr:
    print("STDERR:", result2.stderr[:500])