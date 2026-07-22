#!/usr/bin/env node
// concurrent-edit-warning.mjs — 동시편집 사전경고
// .kilo/worktrees/* 디렉토리에서 같은 파일을 여러 브랜치가 수정 중인지 확인
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

console.log("\x1b[36m=== 동시편집 검사 ===\x1b[0m\n");

const worktreeDir = resolve(ROOT, ".kilo", "worktrees");
if (!existsSync(worktreeDir)) {
  console.log("  \x1b[33m.kilo/worktrees 없음 — 검사 불가\x1b[0m");
  process.exit(0);
}

// 현재 브랜치의 변경 파일 목록
const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
const currentChanges = execSync("git diff --name-only HEAD", { encoding: "utf-8" }).trim().split("\n").filter(Boolean);

if (currentChanges.length === 0) {
  console.log("  현재 브랜치에 변경사항 없음 — 안전\n");
  process.exit(0);
}

// 각 워크트리의 변경사항 확인
try {
  const worktrees = execSync("git worktree list", { encoding: "utf-8" }).trim().split("\n");
  let foundConflict = false;

  for (const wt of worktrees) {
    const parts = wt.split(/\s+/);
    if (parts.length < 3) continue;
    const [wtPath, , wtBranch] = parts;
    if (wtBranch === currentBranch || wtBranch === `worktree/${currentBranch}`) continue;

    try {
      const wtChanges = execSync(`git -C "${wtPath}" diff --name-only HEAD`, { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
      const common = currentChanges.filter(f => wtChanges.includes(f));
      if (common.length > 0) {
        console.log(`  \x1b[31m⚠️  ${wtBranch}와(과) ${common.length}개 파일 동시편집 중!\x1b[0m`);
        common.forEach(f => console.log(`    - ${f}`));
        foundConflict = true;
      }
    } catch {}
  }

  if (!foundConflict) {
    console.log("  \x1b[32m✅ 충돌 위험 없음\x1b[0m\n");
  } else {
    console.log(`\n  \x1b[33m동시편집 위험이 감지되었습니다. 협의 후 진행하세요.\x1b[0m\n`);
  }
} catch {}
