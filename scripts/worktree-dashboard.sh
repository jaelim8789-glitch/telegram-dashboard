#!/usr/bin/env bash
# worktree-dashboard.sh ??Git ?�크?�리 ?�태 ?�눈??보기
#
# Usage:
#   ./scripts/worktree-dashboard.sh                # 모든 ?�크?�리 ?�태
#   ./scripts/worktree-dashboard.sh --json          # JSON 출력 (?�싱??
#   ./scripts/worktree-dashboard.sh --watch         # 5초마???�로고침

set -euo pipefail

ROOT="${TELEMON_ROOT:-/c/Dev/TeleMon}"
MODE="${1:-}"

if [ "$MODE" = "--watch" ]; then
  while true; do
    clear
    "$0" --plain
    sleep 5
  done
  exit 0
fi

render_row() {
  local wt="$1" path="$2" branch="$3" ahead="$4" dirty="$5" last_commit="$6" behind_remote="$7"
  local STATUS_ICON="??
  local DIRTY_FLAG=""
  [ "$dirty" != "clean" ] && STATUS_ICON="?? && DIRTY_FLAG=" ${dirty}"
  [ -n "$behind_remote" ] && STATUS_ICON="??

  if [ "$MODE" = "--json" ]; then
    printf '{"worktree":"%s","path":"%s","branch":"%s","ahead":%s,"dirty":"%s","last_commit":"%s"}\n' \
      "$wt" "$path" "$branch" "$ahead" "$dirty" "$last_commit"
  else
    printf "%-20s %-40s %-30s %4s %-10s %s\n" \
      "$wt" "(${path})" "${branch}" "${ahead}" "${STATUS_ICON}${DIRTY_FLAG}" "${last_commit}"
  fi
}

[ "$MODE" != "--json" ] && [ "$MODE" != "--plain" ] && cat <<'HEADER'

TeleMon Worktree Dashboard
==========================
HEADER

if [ "$MODE" != "--json" ]; then
  printf "%-20s %-40s %-30s %4s %-10s %s\n" "WORKTREE" "PATH" "BRANCH" "AHEAD" "STATUS" "LAST COMMIT"
  printf "%-20s %-40s %-30s %4s %-10s %s\n" "--------" "----" "------" "----" "------" "-----------"
fi

declare -A WORKTREES=(
  ["TeleMon-release"]="/c/Dev/TeleMon-release"
  ["TeleMon-cline"]="/c/Dev/TeleMon-cline"
  ["TeleMon-opencode"]="/c/Dev/TeleMon-opencode"
  ["TeleMon-kiro"]="/c/Dev/TeleMon-kiro"
)

for wt in "TeleMon-release" "TeleMon-cline" "TeleMon-opencode" "TeleMon-kiro"; do
  path="${WORKTREES[$wt]}"

  if [ ! -d "$path" ]; then
    render_row "$wt" "??NOT FOUND" "-" "-" "missing" "-" ""
    continue
  fi

  pushd "$path" > /dev/null 2>&1 || { render_row "$wt" "??CANNOT ACCESS" "-" "-" "error" "-" ""; continue; }

  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
  ahead=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")
  behind=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
  dirty=""
  git diff --quiet 2>/dev/null || dirty="uncommitted"
  [ -z "$dirty" ] && git diff --cached --quiet 2>/dev/null || dirty="staged"
  [ -z "$dirty" ] && dirty="clean"

  last_commit=$(git log --oneline -1 2>/dev/null || echo "N/A")
  behind_remote=""
  [ "$behind" != "0" ] && behind_remote="${behind} behind"

  render_row "$wt" "$(basename $path)" "$branch" "$ahead" "$dirty" "$last_commit" "$behind_remote"

  popd > /dev/null 2>&1 || true
done

# Show the backend repo separately (not a git worktree)
BACKEND_PATH="$ROOT/telegram-dashboard-backend"
if [ -d "$BACKEND_PATH/.git" ]; then
  pushd "$BACKEND_PATH" > /dev/null 2>&1 || true
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "-")
  ahead=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")
  dirty=""
  git diff --quiet 2>/dev/null || dirty="uncommitted"
  [ -z "$dirty" ] && git diff --cached --quiet 2>/dev/null || dirty="staged"
  [ -z "$dirty" ] && dirty="clean"
  last_commit=$(git log --oneline -1 2>/dev/null || echo "N/A")
  if [ "$MODE" != "--json" ]; then
    printf "%-20s %-40s %-30s %4s %-10s %s\n" "backend(repo)" "(telegram-dashboard-backend)" "$branch" "$ahead" "$dirty" "$last_commit"
  fi
  popd > /dev/null 2>&1 || true
fi
