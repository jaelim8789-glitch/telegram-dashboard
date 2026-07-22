#!/usr/bin/env node
// git-bisect-build.mjs — "누가 빌드를 깼는지" 자동 bisect
// CI 실패 시 최근 커밋 중 원인 커밋 자동 특정
import { execSync } from "child_process";

const GOOD_COMMIT = process.argv[2] || "origin/master~20";
const BAD_COMMIT = process.argv[3] || "HEAD";
const BUILD_COMMAND = "npm run build";

console.log("\x1b[36m=== Git Bisect: 빌드 실패 원인 추적 ===\x1b[0m\n");
console.log(`  Good commit: ${GOOD_COMMIT}`);
console.log(`  Bad commit:  ${BAD_COMMIT}`);
console.log(`  Build cmd:   ${BUILD_COMMAND}\n`);

try {
  // bisect 시작
  execSync(`git bisect start ${BAD_COMMIT} ${GOOD_COMMIT}`, { stdio: "pipe" });

  let current = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  let iteration = 0;

  while (true) {
    iteration++;
    process.stdout.write(`  [${iteration}] Testing ${current.slice(0, 12)}... `);

    try {
      execSync(BUILD_COMMAND, { stdio: "pipe", timeout: 300000 });
      process.stdout.write("\x1b[32mGOOD\x1b[0m\n");
      execSync("git bisect good", { stdio: "pipe" });
    } catch {
      process.stdout.write("\x1b[31mBAD\x1b[0m\n");
      execSync("git bisect bad", { stdio: "pipe" });
    }

    const newRev = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    if (newRev === current) break;
    current = newRev;
  }

  const firstBad = execSync("git bisect log", { encoding: "utf-8" })
    .split("\n")
    .filter(l => l.startsWith("# first bad commit"))
    .join("\n");

  console.log(`\n\x1b[31m=== 첫 번째 실패 커밋 ===\x1b[0m`);
  console.log(`  ${current.slice(0, 12)}`);
  const log = execSync(`git log --oneline -1 ${current}`, { encoding: "utf-8" }).trim();
  console.log(`  ${log}`);

  execSync("git bisect reset", { stdio: "pipe" });
  console.log(`\n  bisect reset 완료\n`);

} catch (e) {
  console.error(`\n  Bisect 오류: ${e.message}`);
  try { execSync("git bisect reset", { stdio: "pipe" }); } catch {}
  process.exit(1);
}
