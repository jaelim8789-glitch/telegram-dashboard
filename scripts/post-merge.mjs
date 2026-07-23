#!/usr/bin/env node
// post-merge.mjs — git post-merge 자동 npm/pip install
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

console.log("\x1b[36m=== post-merge — 의존성 자동 설치 ===\x1b[0m");

// package.json 변경 감지
try {
  const changedFiles = execSync("git diff HEAD@{1} HEAD --name-only", { encoding: "utf-8" }).trim();
  if (changedFiles.includes("package.json")) {
    console.log("  package.json 변경 감지 → npm install 실행");
    execSync("npm install", { cwd: ROOT, stdio: "inherit" });
  } else {
    console.log("  package.json 변경 없음 — skip");
  }
} catch {
  console.log("  변경 감지 실패 — npm install 실행");
  execSync("npm install", { cwd: ROOT, stdio: "inherit" });
}

// 백엔드 requirements.txt 변경 감지
const backendDir = resolve(ROOT, "telegram-dashboard-backend");
if (existsSync(backendDir)) {
  try {
    const changedFiles = execSync("git diff HEAD@{1} HEAD --name-only", { encoding: "utf-8" }).trim();
    if (changedFiles.includes("requirements.txt")) {
      console.log("  requirements.txt 변경 감지 → pip install 실행");
      execSync("pip install -r requirements.txt", { cwd: backendDir, stdio: "inherit" });
    }
  } catch {
    console.log("  변경 감지 실패 — skip");
  }
}

console.log("\x1b[32m=== post-merge 완료 ===\x1b[0m");
