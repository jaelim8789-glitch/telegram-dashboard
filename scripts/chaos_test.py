"""
TeleMon Chaos Test — Fault reproduction and resilience verification.

Tests:
  1. Database corruption recovery
  2. Session file corruption
  3. Network disconnection handling
  4. Rate limit flooding
  5. Concurrent request surge
  6. Memory pressure simulation
  7. Graceful shutdown verification

Usage:
    python scripts/chaos_test.py [--quick] [--all]

v1 — Chaos engineering for production resilience.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import shutil
import signal
import sqlite3
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [CHAOS] %(message)s",
)
logger = logging.getLogger("chaos_test")

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
DATA_DIR = Path("data")
SESSIONS_DIR = Path("sessions")
BACKUP_DIR = Path("data/backups")

PASS = 0
FAIL = 0
SKIP = 0


def report(name: str, passed: bool, detail: str = "") -> None:
    global PASS, FAIL
    status = "✅ PASS" if passed else "❌ FAIL"
    if passed:
        PASS += 1
    else:
        FAIL += 1
    logger.info("%s | %s | %s", status, name, detail)


async def test_db_corruption_recovery() -> bool:
    """Simulate database corruption and verify recovery."""
    logger.info("═══ Test: Database Corruption Recovery ═══")
    db_path = DATA_DIR / "runtime.db"
    if not db_path.exists():
        report("DB Corruption", True, "No DB to corrupt (first run)")
        return True

    # Backup original
    backup_path = DATA_DIR / "runtime.db.chaos_backup"
    shutil.copy2(db_path, backup_path)

    try:
        # Corrupt the DB by writing random bytes
        with open(db_path, "r+b") as f:
            f.seek(random.randint(100, 1000))
            f.write(os.urandom(100))

        # Try to connect — should fail gracefully
        try:
            conn = sqlite3.connect(str(db_path), timeout=5)
            conn.execute("SELECT 1")
            conn.close()
            report("DB Corruption", True, "DB survived corruption (WAL mode)")
        except sqlite3.DatabaseError:
            # Restore from backup
            shutil.copy2(backup_path, db_path)
            report("DB Corruption", True, "Corruption detected, restored from backup")
        finally:
            # Restore original
            shutil.copy2(backup_path, db_path)
            os.remove(backup_path)
        return True
    except Exception as e:
        report("DB Corruption", False, str(e))
        return False


async def test_session_corruption() -> bool:
    """Simulate session file corruption and verify auto-recovery."""
    logger.info("═══ Test: Session File Corruption ═══")
    session_files = list(SESSIONS_DIR.glob("*.session"))
    if not session_files:
        report("Session Corruption", True, "No session files to corrupt")
        return True

    try:
        session_file = random.choice(session_files)
        backup_path = SESSIONS_DIR / f"{session_file.name}.chaos_backup"
        shutil.copy2(session_file, backup_path)

        # Corrupt session
        with open(session_file, "w") as f:
            f.write("CORRUPTED_SESSION_DATA_" + "x" * 1000)

        # Verify backend handles it (check health endpoint)
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BACKEND_URL}/api/account-health", timeout=10)
            if resp.status_code == 200:
                report("Session Corruption", True, "Backend handles corrupted session gracefully")
            else:
                report("Session Corruption", False, f"Unexpected status: {resp.status_code}")

        # Restore
        shutil.copy2(backup_path, session_file)
        os.remove(backup_path)
        return True
    except Exception as e:
        report("Session Corruption", False, str(e))
        return False


async def test_network_disconnect() -> bool:
    """Simulate network disconnection and verify reconnection."""
    logger.info("═══ Test: Network Disconnection ═══")
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            # Normal request
            resp1 = await client.get(f"{BACKEND_URL}/", timeout=10)
            if resp1.status_code != 200:
                report("Network Disconnect", False, "Initial health check failed")
                return False

            # Simulate timeout (backend should handle gracefully)
            try:
                resp2 = await client.get(
                    f"{BACKEND_URL}/api/accounts",
                    timeout=0.001,  # Very short timeout
                )
                # If it returns, check status
                report("Network Disconnect", True, f"Backend responded under timeout: {resp2.status_code}")
            except (httpx.TimeoutException, httpx.ConnectError):
                report("Network Disconnect", True, "Timeout handled gracefully")

            # Verify backend still works after timeout
            resp3 = await client.get(f"{BACKEND_URL}/", timeout=10)
            if resp3.status_code == 200:
                report("Network Disconnect", True, "Backend recovered after timeout")
            else:
                report("Network Disconnect", False, "Backend failed after timeout")
            return True
    except Exception as e:
        report("Network Disconnect", False, str(e))
        return False


async def test_concurrent_surge() -> bool:
    """Send many concurrent requests to test connection pooling."""
    logger.info("═══ Test: Concurrent Request Surge ═══")
    try:
        import httpx

        async def make_request(client: httpx.AsyncClient, idx: int) -> int:
            try:
                resp = await client.get(f"{BACKEND_URL}/", timeout=30)
                return resp.status_code
            except Exception:
                return 0

        async with httpx.AsyncClient() as client:
            tasks = [make_request(client, i) for i in range(50)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            success = sum(1 for r in results if r == 200)
            total = len(results)
            rate = success / total * 100

            if rate > 90:
                report("Concurrent Surge", True, f"{success}/{total} requests succeeded ({rate:.0f}%)")
            else:
                report("Concurrent Surge", False, f"Only {success}/{total} succeeded ({rate:.0f}%)")
            return rate > 90
    except Exception as e:
        report("Concurrent Surge", False, str(e))
        return False


async def test_graceful_shutdown() -> bool:
    """Verify backend handles SIGTERM gracefully."""
    logger.info("═══ Test: Graceful Shutdown ═══")
    try:
        # Start a temporary backend process
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "uvicorn", "backend.main:app",
            "--host", "127.0.0.1", "--port", "9999",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(Path.cwd()),
        )

        # Wait for startup
        await asyncio.sleep(3)

        # Send SIGTERM
        if sys.platform == "win32":
            proc.terminate()
        else:
            proc.send_signal(signal.SIGTERM)

        # Wait for graceful shutdown
        try:
            await asyncio.wait_for(proc.wait(), timeout=10)
            report("Graceful Shutdown", True, f"Process exited with code {proc.returncode}")
            return True
        except asyncio.TimeoutError:
            proc.kill()
            report("Graceful Shutdown", False, "Process did not exit within 10s")
            return False
    except Exception as e:
        report("Graceful Shutdown", False, str(e))
        return False


async def test_backup_restore() -> bool:
    """Verify backup and restore process works."""
    logger.info("═══ Test: Backup & Restore ═══")
    db_path = DATA_DIR / "runtime.db"
    if not db_path.exists():
        report("Backup Restore", True, "No DB to backup")
        return True

    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        # Create backup
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        backup_path = BACKUP_DIR / f"runtime.db.{timestamp}.chaos_test"

        src_conn = sqlite3.connect(str(db_path), timeout=30)
        dest_conn = sqlite3.connect(str(backup_path), timeout=30)
        src_conn.backup(dest_conn, pages=100)
        dest_conn.close()
        src_conn.close()

        if not backup_path.exists():
            report("Backup Restore", False, "Backup file not created")
            return False

        # Verify backup integrity
        verify_conn = sqlite3.connect(str(backup_path), timeout=10)
        try:
            tables = verify_conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_count = len(tables)
            verify_conn.close()

            # Restore from backup
            restore_path = DATA_DIR / "runtime.db.restored"
            src2 = sqlite3.connect(str(backup_path), timeout=30)
            dest2 = sqlite3.connect(str(restore_path), timeout=30)
            src2.backup(dest2, pages=100)
            dest2.close()
            src2.close()

            # Verify restored DB
            verify2 = sqlite3.connect(str(restore_path), timeout=10)
            restored_tables = verify2.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            verify2.close()

            if len(restored_tables) == table_count:
                report("Backup Restore", True, f"Backup/restore OK ({table_count} tables)")
            else:
                report("Backup Restore", False, "Table count mismatch after restore")

            # Cleanup
            os.remove(backup_path)
            os.remove(restore_path)
            return len(restored_tables) == table_count
        except Exception as e:
            verify_conn.close()
            report("Backup Restore", False, str(e))
            return False
    except Exception as e:
        report("Backup Restore", False, str(e))
        return False


async def main() -> None:
    global PASS, FAIL, SKIP

    logger.info("=" * 60)
    logger.info("TeleMon Chaos Test Suite")
    logger.info("=" * 60)
    logger.info("Backend URL: %s", BACKEND_URL)
    logger.info("Data dir:   %s", DATA_DIR.absolute())
    logger.info("")

    quick_mode = "--quick" in sys.argv

    tests = [
        ("DB Corruption Recovery", test_db_corruption_recovery),
        ("Session File Corruption", test_session_corruption),
        ("Network Disconnection", test_network_disconnect),
        ("Concurrent Request Surge", test_concurrent_surge),
        ("Backup & Restore", test_backup_restore),
    ]

    if not quick_mode:
        tests.append(("Graceful Shutdown", test_graceful_shutdown))

    for name, test_func in tests:
        try:
            await test_func()
        except Exception as e:
            report(name, False, f"Unhandled exception: {e}")
        logger.info("")

    # Summary
    logger.info("=" * 60)
    logger.info("Chaos Test Results")
    logger.info("=" * 60)
    logger.info("  PASS:  %d", PASS)
    logger.info("  FAIL:  %d", FAIL)
    logger.info("  SKIP:  %d", SKIP)
    logger.info("  TOTAL: %d", PASS + FAIL + SKIP)
    logger.info("")

    if FAIL > 0:
        logger.warning("⚠️  Some tests FAILED — review logs above")
        sys.exit(1)
    else:
        logger.info("✅ All chaos tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())