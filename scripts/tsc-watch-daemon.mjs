#!/usr/bin/env node
// tsc-watch-daemon.mjs — 증분 타입체크 데몬
// 저장할 때마다 백그라운드에서 증분 tsc 돌면서 새로 생긴 에러만 표시
import { spawn } from "child_process";
import { watch } from "fs";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const CACHE_FILE = resolve(ROOT, ".tsc-error-cache.json");

let previousErrors = [];
if (existsSync(CACHE_FILE)) {
  try { previousErrors = JSON.parse(readFileSync(CACHE_FILE, "utf-8")); } catch {}
}

function runTsc() {
  return new Promise((resolvePromise) => {
    const proc = spawn("npx", ["tsc", "--noEmit"], { cwd: ROOT, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    proc.stdout.on("data", (d) => { output += d; });
    proc.stderr.on("data", (d) => { output += d; });
    proc.on("close", (code) => {
      const errors = parseErrors(output);
      const newErrors = errors.filter((e) => !previousErrors.some((p) => p.file === e.file && p.line === e.line && p.msg === e.msg));
      const fixedErrors = previousErrors.filter((p) => !errors.some((e) => e.file === p.file && e.line === p.line && e.msg === p.msg));
      if (newErrors.length > 0) {
        console.log(`\n\x1b[31m[tsc:watch] ${newErrors.length} NEW error(s):\x1b[0m`);
        newErrors.forEach((e) => console.log(`  ${e.file}:${e.line}:${e.col} - ${e.msg}`));
      }
      if (fixedErrors.length > 0) {
        console.log(`\n\x1b[32m[tsc:watch] ${fixedErrors.length} error(s) fixed:\x1b[0m`);
        fixedErrors.forEach((e) => console.log(`  ${e.file}:${e.line} - ${e.msg}`));
      }
      if (newErrors.length === 0 && fixedErrors.length === 0) {
        const timestamp = new Date().toLocaleTimeString();
        process.stdout.write(`\r\x1b[90m[tsc:watch] ${timestamp} — no changes\x1b[0m`);
      }
      try { require("fs").writeFileSync(CACHE_FILE, JSON.stringify(errors)); } catch {}
      resolvePromise();
    });
  });
}

function parseErrors(output) {
  const errors = [];
  const lines = output.split("\n");
  for (const line of lines) {
    const match = line.match(/^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
    if (match) {
      errors.push({ file: match[1], line: parseInt(match[2]), col: parseInt(match[3]), code: match[4], msg: match[5] });
    }
  }
  return errors;
}

console.log("\x1b[36m[tsc:watch] 데몬 시작 — 파일 저장 시 증분 타입체크\x1b[0m");
console.log("\x1b[90m[tsc:watch] 첫 실행은 전체 체크라 시간이 걸릴 수 있습니다.\x1b[0m\n");

runTsc().then(() => {
  const srcDir = resolve(ROOT, "src");
  const watchers = new Set();
  function watchDir(dir) {
    try {
      const w = watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith(".ts") || filename.endsWith(".tsx"))) {
          runTsc();
        }
      });
      watchers.add(w);
    } catch {}
  }
  watchDir(srcDir);
  watchDir(resolve(ROOT, "public"));
  process.on("SIGINT", () => { watchers.forEach(w => w.close()); process.exit(0); });
  process.on("SIGTERM", () => { watchers.forEach(w => w.close()); process.exit(0); });
});
