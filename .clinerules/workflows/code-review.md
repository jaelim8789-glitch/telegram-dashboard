# /code-review

Review the current diff (uncommitted changes, or the diff of the branch vs `master` if the
working tree is clean) for correctness bugs and reuse/simplification/efficiency issues.
Mirrors Claude Code's `/code-review` skill so the two agents produce comparable review output
on this repo.

## Steps

1. Determine the diff to review:
   - If there are uncommitted changes: `git diff` and `git diff --staged`.
   - Otherwise: `git diff master...HEAD` (or the relevant base branch).
2. Read every changed file in full (not just the diff hunks) — surrounding context is often
   where a bug actually lives.
3. Look for, in priority order:
   - **Correctness bugs**: logic errors, off-by-one, wrong operator, unhandled edge case,
     race conditions, incorrect null/undefined handling, broken async flow.
   - **Reuse/simplification**: duplicated logic that already exists elsewhere in the repo,
     unnecessary abstraction, dead code introduced by the change.
   - **Efficiency**: obviously wasteful loops/queries (e.g. N+1 patterns), unnecessary
     re-renders, redundant network/DB calls.
4. For each finding, report:
   - File and line number
   - One-sentence summary of the defect
   - A concrete failure scenario (what input/state triggers it, what breaks)
5. Rank findings most-severe first. Do not report style nitpicks or purely subjective
   preferences — only defects with a real failure scenario or measurable cost.
6. Do not apply fixes automatically unless explicitly asked — report findings first.

## Scope notes specific to this repo

- `TeleMon/app/` and `TeleMon/backend/` (root-level, no leading path) are legacy/unrelated
  Python code — do not review or flag issues in these unless the diff itself touches them.
- The real backend lives in `TeleMon/telegram-dashboard-backend/` (separate git repo).
- Check `docs/deployment/known-issues.md` before flagging anything related to the Docker
  build context — that specific issue is already documented and fixed.
