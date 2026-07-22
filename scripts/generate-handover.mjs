#!/usr/bin/env node
// generate-handover.mjs — 에이전트 세션 인수인계 자동 생성
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(ROOT, "HANDOVER.md");

console.log("\x1b[36m=== 인수인계 생성 ===\x1b[0m\n");

// 1. 최근 변경사항
const recentLog = execSync("git log --oneline -10", { encoding: "utf-8" }).trim();
console.log("  최근 커밋 로드 완료");

// 2. 변경된 파일
const changedFiles = execSync("git diff --name-only HEAD~5 HEAD", { encoding: "utf-8" }).trim().split("\n").filter(Boolean);

// 3. uncommitted 상태
let uncommitted = "";
try {
  uncommitted = execSync("git status --short", { encoding: "utf-8" }).trim();
} catch {}

// 4. 브랜치 정보
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
const lastCommit = execSync("git log --oneline -1", { encoding: "utf-8" }).trim();

const handover = `# 🤖 인수인계 — ${new Date().toISOString().slice(0, 10)}

## 📋 기본 정보
- **브랜치:** \`${branch}\`
- **마지막 커밋:** ${lastCommit}
- **생성일:** ${new Date().toLocaleString("ko-KR")}

## 📦 최근 변경사항 (10개)
\`\`\`
${recentLog}
\`\`\`

## 📁 변경된 파일 (최근 5 커밋)
${changedFiles.map((f) => `- \`${f}\``).join("\n")}

## 🔴 막힌 지점 / 주의사항
- (여기에 자동 감지된 이슈가 없습니다. 직접 작성해주세요.)

## ✅ 다음 할 일
1. (직접 작성)
2. (직접 작성)

## 📊 Uncommitted 상태
\`\`\`
${uncommitted || "(clean)"}
\`\`\`

---
*자동 생성 — 필요 시 수정하세요.*
`;

writeFileSync(OUTPUT, handover, "utf-8");
console.log(`  \x1b[32m✅ HANDOVER.md 생성 완료\x1b[0m\n`);
