#!/usr/bin/env node
// generate-weekly-report.mjs — 주간 변경사항 자동 리포트
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(ROOT, "WEEKLY_REPORT.md");

const since = process.argv[2] || "7.days.ago";

console.log("\x1b[36m=== 주간 리포트 생성 ===\x1b[0m\n");

try {
  const log = execSync(`git log --oneline --since="${since}" --format="%h %ai %s"`, { encoding: "utf-8" }).trim();
  const lines = log.split("\n").filter(Boolean);

  const stats = execSync(`git diff --stat $(git rev-list --max-parents=0 HEAD)..HEAD`, { encoding: "utf-8" }).trim();
  const lastLine = stats.split("\n").pop() || "";

  const filesChanged = execSync(`git diff --name-only $(git rev-list --max-parents=0 HEAD)..HEAD`, { encoding: "utf-8" }).trim().split("\n").filter(Boolean);

  // 파일 타입별 통계
  const types = {};
  for (const f of filesChanged) {
    const ext = f.split(".").pop();
    types[ext] = (types[ext] || 0) + 1;
  }
  const typeSummary = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- \`*.${k}\`: ${v}개`).join("\n");

  const report = `# 📊 주간 변경사항 리포트
**기간:** ${since} ~ 현재
**생성일:** ${new Date().toLocaleString("ko-KR")}

## 📦 커밋 요약
총 **${lines.length}개** 커밋

| 커밋 | 날짜 | 내용 |
|------|------|------|
${lines.map((l) => {
  const parts = l.match(/^(\S+)\s+(\S+ \S+)\s+(.+)$/);
  if (!parts) return `| ${l} | | |`;
  return `| \`${parts[1]}\` | ${parts[2]} | ${parts[3]} |`;
}).join("\n")}

## 📁 변경 파일 통계
${lastLine || "(통계 없음)"}

### 파일 타입별
${typeSummary || "(분류 없음)"}

## 🔴 주의사항
- (자동 감지된 이슈가 없습니다)
`;
  writeFileSync(OUTPUT, report, "utf-8");
  console.log(`  \x1b[32m✅ WEEKLY_REPORT.md 생성 완료 (${lines.length}개 커밋)\x1b[0m\n`);
} catch (e) {
  console.error(`  \x1b[31m오류: ${e.message}\x1b[0m`);
  process.exit(1);
}
