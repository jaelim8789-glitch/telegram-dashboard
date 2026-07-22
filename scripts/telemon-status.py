#!/usr/bin/env python3
"""telemon-status — 현재 전체 상태 한 화면에 출력

Usage:
    python scripts/telemon-status.py           # 기본
    python scripts/telemon-status.py --json    # JSON 출력 (파이프용)

출력:
    - 각 워크트리 uncommitted 상태
    - 마지막 배포 커밋
    - CI 상태 (GitHub CLI 필요, 없으면 생략)
"""
import subprocess
import json
import sys
import os
from pathlib import Path
from datetime import datetime

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKTREE_BASE = "c:\\Dev"


def run(cmd, cwd=None):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd or REPO_ROOT, timeout=30)
        return r.stdout.strip()
    except Exception:
        return ""


def fmt(s):
    return s if s else "(empty)"


def worktree_status():
    wt_list = run("git worktree list").split("\n")
    entries = []
    for line in wt_list:
        parts = line.split()
        if len(parts) < 3:
            continue
        path, branch = parts[0], parts[2].strip("[]")
        if branch == "master":
            continue
        # Check uncommitted
        dirty = run("git status --porcelain", cwd=path)
        n_uncommitted = len([l for l in dirty.split("\n") if l.strip()]) if dirty else 0
        last_commit = run("git log --oneline -1", cwd=path) if path else ""
        ahead = run("git rev-list --count @{u}..HEAD", cwd=path) if path else "?"
        entries.append({
            "worktree": path,
            "branch": branch,
            "uncommitted": n_uncommitted,
            "last_commit": last_commit,
            "ahead": ahead,
        })
    return entries


def last_deploy():
    """Check VPS for last deploy commit (via SSH)"""
    out = run(f"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${{VPS_HOST:-}} "
              "\"cd /opt/telemon && echo '=== frontend ===' && git log --oneline -1 "
              "&& echo '=== backend ===' && cd /opt/telemon/backend && git log --oneline -1\" 2>/dev/null || true")
    return out


def ci_status():
    """Check latest CI run (needs gh CLI)"""
    out = run("gh run list --repo telegram-dashboard --limit 3 --json conclusion,displayTitle,headBranch,createdAt 2>/dev/null || true")
    if not out:
        return []
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return []


def main():
    show_json = "--json" in sys.argv

    wt = worktree_status()
    deploy = last_deploy()
    ci = ci_status()

    if show_json:
        print(json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "worktrees": wt,
            "last_deploy": deploy,
            "ci_runs": ci,
        }, indent=2, ensure_ascii=False))
        return

    # Human output
    print("=" * 65)
    print(f"  📊 TeleMon 전체 상태  —  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # Worktrees
    print("\n📁 워크트리 상태:")
    print("-" * 65)
    print(f"  {'경로':<30} {'브랜치':<22} {'변경':>4} {'Ahead':>5}  마지막 커밋")
    print("-" * 65)
    for w in wt:
        print(f"  {Path(w['worktree']).name:<30} {w['branch']:<22} {w['uncommitted']:>4} {w['ahead']:>5}  {w['last_commit'][:50]}")

    # Deploy
    print("\n🚀 마지막 배포:")
    print("-" * 65)
    if deploy:
        for line in deploy.split("\n"):
            print(f"  {line}")
    else:
        print("  (VPS 연결 안 됨 — SKIP)")

    # CI
    if ci:
        print("\n🤖 최근 CI 실행:")
        print("-" * 65)
        print(f"  {'브랜치':<25} {'상태':<12} {'시간'}")
        print("-" * 65)
        for r in ci[:5]:
            conclusion = r.get("conclusion") or "pending"
            icon = {"success": "✅", "failure": "❌", "cancelled": "⏹️"}.get(conclusion, "⏳")
            created = r.get("createdAt", "")[5:19] if r.get("createdAt") else ""
            print(f"  {icon} {r.get('headBranch','?'):<25} {conclusion:<12} {created}")
    else:
        print("\n🤖 CI: (gh CLI 없음 — SKIP)")

    print("=" * 65)
    print()


if __name__ == "__main__":
    main()
