"""Production Smoke Test for TeleMon deployment.

Usage:
    python scripts/smoke_test.py [BASE_URL]

Default BASE_URL: http://localhost:3000

Safe checks — no destructive operations, no real payments, no real Telegram messages.
"""

import json
import sys
import urllib.error
import urllib.request

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
PASS = 0
FAIL = 0


def check(label: str, method: str, path: str, expected_status: int = 200,
           expected_text: str | None = None) -> None:
    global PASS, FAIL
    url = BASE_URL.rstrip("/") + path
    req = urllib.request.Request(url, method=method)
    try:
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        opener = urllib.request.build_opener(NoRedirectHandler)
        resp = opener.open(req, timeout=10)
        status = resp.status
        body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  FAIL [{label}] — {e}")
        FAIL += 1
        return

    ok = status == expected_status
    if expected_text and expected_text not in body:
        ok = False
    if ok:
        print(f"  PASS [{label}] — HTTP {status}")
        PASS += 1
    else:
        msg = f"  FAIL [{label}] — expected {expected_status}, got {status}"
        if expected_text:
            msg += f", expected text '{expected_text}' not in body"
        print(msg)
        FAIL += 1


def main() -> int:
    global PASS, FAIL
    print(f"TeleMon Smoke Test — {BASE_URL}")
    print()

    check("Backend Health", "GET", "/health",
          expected_status=200, expected_text='"status":"ok"')
    check("Frontend Homepage", "GET", "/",
          expected_status=200, expected_text="TeleMon")
    check("Pricing Page", "GET", "/pricing", expected_status=200)
    check("Signup Page", "GET", "/signup", expected_status=200)
    check("Get API Key Page", "GET", "/get-api-key", expected_status=200)
    check("Admin Login Page", "GET", "/admin/login", expected_status=200)

    check("Admin Dashboard (no auth)", "GET", "/admin/dashboard",
          expected_status=403)
    check("App Dashboard (no auth)", "GET", "/app", expected_status=403)

    check("Features Page", "GET", "/features", expected_status=200)
    check("OpenAPI Schema (should 404 in prod)", "GET", "/docs",
          expected_status=404)

    print()
    print(f"Results: {PASS} passed, {FAIL} failed out of {PASS + FAIL} tests")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
