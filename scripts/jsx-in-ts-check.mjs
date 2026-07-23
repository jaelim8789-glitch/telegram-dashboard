#!/usr/bin/env node
// jsx-in-ts-check.mjs — JSX-in-.ts 초고속 사전 검사 (1초 이내)
// 전체 tsc 안 돌리고 파일 확장자+JSX 패턴만 정규식으로 체크
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, extname } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = resolve(ROOT, "src");

let foundIssues = false;

function findAllFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...findAllFiles(full));
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

const files = findAllFiles(SRC);

// Check 1: .ts 파일에 JSX가 있는지
console.log("\x1b[36m[JSX-in-.ts 검사]\x1b[0m");
for (const file of files) {
  if (extname(file) !== ".ts") continue;
  try {
    const content = readFileSync(file, "utf-8");
    if (/<[A-Z][\w]*(\s|>)/.test(content) || /<\/([A-Z]|[\w]+)>/.test(content) || /<>[\s\S]*<\/>/.test(content)) {
      console.log(`  \x1b[31m⚠  ${file.replace(SRC, "src")} — JSX in .ts file, should be .tsx\x1b[0m`);
      foundIssues = true;
    }
  } catch {}
}

// Check 2: .tsx 파일에 generic arrow function이 <>를 JSX로 오해할 여지가 있는지
for (const file of files) {
  if (extname(file) !== ".tsx") continue;
  try {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/<(\w+)>\((.+)\)\s*=>/);
      if (match && !lines[i].includes(",")) {
        console.log(`  \x1b[33m⚠  ${file.replace(SRC, "src")}:${i + 1} — generic arrow missing trailing comma (<T,>)\x1b[0m`);
        foundIssues = true;
      }
    }
  } catch {}
}

if (foundIssues) {
  console.log(`\n\x1b[31m❌ JSX-in-.ts 문제 발견. 수정 후 다시 시도하세요.\x1b[0m`);
  process.exit(1);
} else {
  console.log(`  \x1b[32m✅ ${files.length}개 파일 검사 완료, 이상 없음\x1b[0m`);
  process.exit(0);
}
