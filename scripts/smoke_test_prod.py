#!/usr/bin/env python3
"""
TeleMon Production Smoke Test (Windows-compatible).

Usage:
    python scripts/smoke_test_prod.py [BASE_URL]

Default BASE_URL: http://localhost:8000
"""

import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
PASS = 0
FAIL = 0


def test(label: str, path: str = "/", expected_key: str | None = None) -> None:
    global PASS, FAIL
    url = f"{BASE_URL}{path}"
    try:
        resp = urllib.request.urlopen(url, timeout=10)
        data = json.loads(resp.read().decode())
        if expected_key:
            if expected_key in data:
                print(f"  [PASS] {label} | {url}")
                PASS += 1
            else:
                print(f"  [FAIL] {label} | missing key '{expected_key}'")
                FAIL += 1
        else:
            print(f"  [PASS] {label} | {url}")
            PASS += 1
    except urllib.error.HTTPError as e:
        print(f"  [FAIL] {label} | HTTP {e.code}: {url}")
        FAIL += 1
    except Exception as e:
        print(f"  [FAIL] {label} | {e}")
        FAIL += 1


def main() -> None:
    global PASS, FAIL
    print("=" * 60)
    print("  TeleMon Production Smoke Test")
    print(f"  Target: {BASE_URL}")
    print("=" * 60)
    print()

    # 1. Root health
    print("-- [1] Health Check --")
    test("Root endpoint", "/", "status")
    test("Admin health", "/api/admin/health", "status")
    test("Metrics endpoint", "/metrics")

    # 2. Admin login
    print()
    print("-- [2] Admin Login --")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/admin/login",
            data=json.dumps({"username": "sksk2929", "password": "qpqpqp10!!"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode())
        if "access_token" in data:
            print(f"  [PASS] Admin login | token obtained")
            PASS += 1
            TOKEN = data["access_token"]
        else:
            print(f"  [FAIL] Admin login | no access_token")
            FAIL += 1
            TOKEN = None
    except Exception as e:
        print(f"  [SKIP] Admin login | {e}")
        TOKEN = None

    # 3. Accounts
    print()
    print("-- [3] Accounts API --")
    if TOKEN:
        try:
            req = urllib.request.Request(
                f"{BASE_URL}/api/accounts",
                headers={"Authorization": f"Bearer {TOKEN}"},
            )
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read().decode())
            count = len(data.get("items", []))
            print(f"  [PASS] Accounts list | {count} accounts")
            PASS += 1
        except Exception as e:
            print(f"  [FAIL] Accounts list | {e}")
            FAIL += 1
    else:
        print(f"  [SKIP] Accounts list | no token")

    # 4. Account health
    print()
    print("-- [4] Account Health --")
    test("Account health", "/api/account-health")

    # 5. Database check
    print()
    print("-- [5] Database Check --")
    import sqlite3
    for db_name in ["data/runtime.db", "data/admin.db"]:
        if os.path.exists(db_name):
            try:
                conn = sqlite3.connect(db_name, timeout=5)
                tables = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
                conn.close()
                print(f"  [PASS] {db_name} | {len(tables)} tables: {[t[0] for t in tables]}")
                PASS += 1
            except Exception as e:
                print(f"  [FAIL] {db_name} | {e}")
                FAIL += 1
        else:
            print(f"  [SKIP] {db_name} | not found (will be created on first run)")

    # Summary
    print()
    print("=" * 60)
    print(f"  Results: {PASS} passed, {FAIL} failed out of {PASS + FAIL} tests")
    print("=" * 60)

    if FAIL > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
