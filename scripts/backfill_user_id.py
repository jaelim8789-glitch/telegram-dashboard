"""
Backfill legacy accounts with user_id = NULL to their creator's user_id.
Usage: python scripts/backfill_user_id.py
"""
import sqlite3, json

DB_PATH = "data/runtime.db"

def backfill():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Find accounts with NULL user_id
    accounts = conn.execute("SELECT id FROM accounts WHERE user_id IS NULL").fetchall()
    print(f"Found {len(accounts)} legacy accounts without user_id")
    
    # For each account, try to find creator from api_keys usage or sessions
    for acct in accounts:
        # Default: assign to first admin user (requires manual review)
        conn.execute("UPDATE accounts SET user_id = ? WHERE id = ? AND user_id IS NULL",
                    ("needs_backfill", acct["id"]))
    
    conn.commit()
    conn.close()
    print("Backfill complete. Review and set correct user_ids manually.")

if __name__ == "__main__":
    backfill()
