# /security-review

Review the current diff (or, if asked to review the whole repo, the changed surface area) for
security issues. Mirrors Claude Code's `/security-review` skill.

## Steps

1. Determine the diff to review (same as `/code-review`: uncommitted changes, or
   `git diff master...HEAD`).
2. Check specifically for OWASP-Top-10-class issues introduced or touched by the diff:
   - Injection (SQL, command, template) — especially raw string interpolation into
     `execute_sql`, `subprocess`, or shell commands.
   - Broken auth/access control — missing tenant/account ownership checks, missing
     `require_account_tenant_access` (backend convention in this repo), IDOR-shaped bugs
     where an ID from the request is trusted without a scoping check.
   - Secrets — hardcoded API keys/passwords/tokens, secrets logged, secrets committed to
     files that aren't `.gitignore`d (check `git check-ignore -v <file>` before assuming).
   - Unsafe deserialization / `eval`-like patterns.
   - XSS — unescaped user content rendered into HTML/JSX via `dangerouslySetInnerHTML` or
     equivalent.
   - SSRF — outbound requests built from user-controlled URLs/hosts without an allowlist.
3. For each finding, report: file/line, the concrete exploit scenario (what a malicious
   input/actor would do), and severity.
4. Do not report theoretical issues with no realistic trigger path in this codebase — every
   finding needs a concrete "attacker does X, causes Y" scenario.
5. Do not apply fixes automatically unless explicitly asked — report findings first.

## Scope notes specific to this repo

- Backend auth patterns live in `telegram-dashboard-backend/app/api/deps.py`
  (`get_current_identity`, `require_account_tenant_access`, `require_admin`) — use these as
  the reference for "is this endpoint correctly scoped" rather than guessing.
- `telegram-dashboard-backend/app/core/limits.py` and `media.py` control upload validation —
  check new upload/media code against the existing `ALLOWED_MEDIA_CONTENT_TYPES` pattern.
- Never propose committing `.env`, `app/.env`, or any file containing a real API key/DB
  password — flag it as a finding instead.
