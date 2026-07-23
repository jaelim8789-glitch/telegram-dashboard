#!/usr/bin/env node
// worktree-dashboard.mjs — 워크트리 전체 상태 원커맨드 대시보드
import { execSync } from "child_process";

console.log("\n\x1b[36m══════════════════════════════════════════\x1b[0m");
console.log("\x1b[36m      TeleMon Worktree 상태 대시보드\x1b[0m");
console.log("\x1b[36m══════════════════════════════════════════\x1b[0m\n");

try {
  const worktreeOutput = execSync("git worktree list", { encoding: "utf-8" });
  const lines = worktreeOutput.trim().split("\n");

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const [path, sha, branch] = parts;
    const name = path.split("\\").pop() || path.split("/").pop();
    const isCurrent = path.includes(process.cwd()) ? " ← 현재" : "";

    console.log(`  \x1b[1m${name}\x1b[0m${isCurrent}`);
    console.log(`    브랜치: ${branch}`);

    try {
      const status = execSync(`git -C "${path}" status --short`, { encoding: "utf-8" }).trim();
      if (status) {
        const lines2 = status.split("\n").length;
        console.log(`    \x1b[33m📝 uncommitted: ${lines2}개 파일\x1b[0m`);
      } else {
        console.log(`    \x1b[32m✅ clean\x1b[0m`);
      }

      const log = execSync(`git -C "${path}" log --oneline -3`, { encoding: "utf-8" }).trim();
      console.log(`    최근 커밋:`);
      log.split("\n").forEach((l) => console.log(`      ${l}`));

      const ahead = execSync(`git -C "${path}" rev-list --count HEAD..origin/${branch.replace(/^.*\//, "")} 2>nul || echo 0`, { encoding: "utf-8" }).trim();
      const behind = execSync(`git -C "${path}" rev-list --count origin/${branch.replace(/^.*\//, "")}..HEAD 2>nul || echo 0`, { encoding: "utf-8" }).trim();
      console.log(`    ${ahead > "0" ? "\x1b[31m⬆" : "⬆"} ahead ${ahead}  ${behind > "0" ? "\x1b[33m⬇" : "⬇"} behind ${behind}\x1b[0m`);
    } catch {}

    console.log("");
  }
} catch (e) {
  console.error("Worktree 목록을 가져올 수 없습니다:", e.message);
}
