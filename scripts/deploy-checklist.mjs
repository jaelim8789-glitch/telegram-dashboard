#!/usr/bin/env node
// deploy-checklist.mjs — 배포 전 체크리스트 자동 검증
// 테스트 통과 / 마이그레이션 단일 헤드 / env 변수 존재를 스크립트가 판정
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const BACKEND = resolve(ROOT, "telegram-dashboard-backend");

const results = [];
function check(name, fn) {
  try {
    const ok = fn();
    results.push({ name, ok, detail: ok ? "✅" : "❌" });
    if (!ok) console.log(`  \x1b[31m❌ ${name}\x1b[0m`);
    else console.log(`  \x1b[32m✅ ${name}\x1b[0m`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.log(`  \x1b[31m❌ ${name} — ${e.message}\x1b[0m`);
  }
}

console.log("\n\x1b[36m=== 배포 전 체크리스트 ===\x1b[0m\n");

// 1. 프론트엔드 타입체크
check("프론트엔드 타입체크 (tsc --noEmit)", () => {
  execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "pipe" });
  return true;
});

// 2. 프론트엔드 린트
check("프론트엔드 린트 (eslint)", () => {
  execSync("npx eslint --max-warnings=0 src/", { cwd: ROOT, stdio: "pipe" });
  return true;
});

// 3. 백엔드 존재 확인
check("백엔드 디렉토리 존재", () => existsSync(resolve(BACKEND, "app")));

// 4. Alembic 마이그레이션 단일 헤드
check("Alembic 단일 헤드", () => {
  if (!existsSync(resolve(BACKEND, "alembic"))) return true;
  const heads = execSync("cd telegram-dashboard-backend && alembic heads", { cwd: ROOT, encoding: "utf-8" });
  const lines = heads.trim().split("\n").filter(Boolean);
  if (lines.length > 1) throw new Error(`마이그레이션 헤드가 ${lines.length}개입니다. 병합이 필요합니다.`);
  return true;
});

// 5. env 파일 존재
check(".env.local 존재", () => existsSync(resolve(ROOT, ".env.local")));

// 6. 필수 env 변수
check("필수 env 변수 존재", () => {
  if (!existsSync(resolve(ROOT, ".env.local"))) throw new Error(".env.local 없음");
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf-8");
  const required = ["NEXT_PUBLIC_API_BASE_URL", "ENCRYPTION_KEY"];
  const missing = required.filter((k) => !env.includes(k));
  if (missing.length > 0) throw new Error(`누락: ${missing.join(", ")}`);
  return true;
});

// 7. git worktree 상태
check("현재 브랜치가 release worktree인가", () => {
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  if (branch !== "worktree/release") {
    console.log(`  \x1b[33m   현재 브랜치: ${branch} (release 아님 — 경고)\x1b[0m`);
  }
  return true;
});

// 8. 빌드
check("next build", () => {
  execSync("npm run build", { cwd: ROOT, stdio: "pipe", timeout: 300000 });
  return true;
});

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n\x1b[36m=== 결과: ${passed}/${total} 통과 ===\x1b[0m\n`);

if (passed < total) {
  console.log(`\x1b[31m❌ 배포 불가 — ${total - passed}개 항목 실패\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✅ 모든 체크 통과 — 배포 가능\x1b[0m`);
  process.exit(0);
}
