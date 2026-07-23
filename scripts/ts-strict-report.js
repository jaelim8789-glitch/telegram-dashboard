#!/usr/bin/env node
/**
 * TypeScript Strict Violation Weekly Report
 *
 * Runs tsc --noEmit with strict checks, parses error output into a categorized
 * report grouped by error code and file path.
 *
 * Usage:
 *   node scripts/ts-strict-report.js              # full report
 *   node scripts/ts-strict-report.js --count-only  # just the totals
 *   node scripts/ts-strict-report.js --html        # HTML report
 *
 * Output: report/ts-strict-report.json (and .html with --html)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const countOnly = args.includes("--count-only");
const htmlOutput = args.includes("--html");

const REPORT_DIR = path.join(__dirname, "..", "report");
fs.mkdirSync(REPORT_DIR, { recursive: true });

console.log("🔍 Running tsc --noEmit for strict violation report...\n");

let stdout;
try {
  stdout = execSync("npx tsc --noEmit 2>&1", {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  }).toString();
} catch (e) {
  stdout = e.stdout?.toString() || "";
}

// Parse error lines: file.ts(line,col): error TS1234: message
const errorRegex = /^([^(]+)\((\d+),\d+\): error (TS\d+): (.+)$/gm;
const errors = [];
let match;
while ((match = errorRegex.exec(stdout)) !== null) {
  errors.push({
    file: match[1].trim(),
    line: parseInt(match[2], 10),
    code: match[3],
    message: match[4].trim(),
  });
}

// Group by error code
const byCode = {};
for (const e of errors) {
  if (!byCode[e.code]) byCode[e.code] = [];
  byCode[e.code].push(e);
}

// Group by file
const byFile = {};
for (const e of errors) {
  if (!byFile[e.file]) byFile[e.file] = [];
  byFile[e.file].push(e);
}

const topFiles = Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 15);

const topCodes = Object.entries(byCode)
  .sort((a, b) => b[1].length - a[1].length);

const report = {
  generatedAt: new Date().toISOString(),
  totalErrors: errors.length,
  uniqueFiles: Object.keys(byFile).length,
  uniqueCodes: Object.keys(byCode).length,
  topFiles: topFiles.map(([file, errs]) => ({
    file,
    count: errs.length,
    codes: [...new Set(errs.map((e) => e.code))],
  })),
  topCodes: topCodes.map(([code, errs]) => ({
    code,
    count: errs.length,
    files: [...new Set(errs.map((e) => e.file))].length,
  })),
};

// Save JSON
const jsonPath = path.join(REPORT_DIR, "ts-strict-report.json");
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log(`📄 JSON report: ${jsonPath}`);

// HTML output
if (htmlOutput) {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>TS Strict Report</title>
<style>
body{font-family:system-ui;max-width:960px;margin:2rem auto;padding:0 1rem}
h1{color:#d32f2f}.summary{display:flex;gap:2rem;margin:1rem 0}
.card{background:#f5f5f5;border-radius:8px;padding:1rem 1.5rem;flex:1}
.card h2{margin:0 0 .25rem;font-size:2rem}.card p{margin:0;color:#666}
table{width:100%;border-collapse:collapse;margin:1rem 0}
th,td{text-align:left;padding:.5rem;border-bottom:1px solid #ddd}
th{background:#fafafa}.num{text-align:right;font-variant-numeric:tabular-nums}
.bar{display:inline-block;height:12px;background:#d32f2f22;border-radius:6px;vertical-align:middle;margin-right:4px}
.bar-fill{display:block;height:12px;background:#d32f2f;border-radius:6px}
.meta{color:#888;font-size:.85rem;margin-top:2rem}
</style></head>
<body>
<h1>🚨 TypeScript Strict 위반 리포트</h1>
<p>생성: ${report.generatedAt}</p>
<div class="summary">
<div class="card"><h2>${report.totalErrors}</h2><p>오류</p></div>
<div class="card"><h2>${report.uniqueFiles}</h2><p>파일</p></div>
<div class="card"><h2>${report.uniqueCodes}</h2><p>오류 코드</p></div>
</div>

<h2>🔝 상위 파일</h2>
<table><tr><th>파일</th><th class="num">오류</th><th>바</th><th>코드</th></tr>
${topFiles.map(([file, errs]) =>
  `<tr><td>${file}</td><td class="num">${errs.length}</td>
  <td><div class="bar" style="width:100px"><span class="bar-fill" style="width:${Math.min(100, (errs.length / topFiles[0][1].length) * 100)}%"></span></div></td>
  <td>${[...new Set(errs.map(e => e.code))].join(", ")}</td></tr>`
).join("\n")}
</table>

<h2>🔝 상위 오류 코드</h2>
<table><tr><th>코드</th><th class="num">횟수</th><th class="num">파일</th></tr>
${topCodes.map(([code, errs]) =>
  `<tr><td>${code}</td><td class="num">${errs.length}</td><td class="num">${new Set(errs.map(e => e.file)).size}</td></tr>`
).join("\n")}
</table>

<p class="meta">전체 ${report.uniqueFiles}개 파일, ${report.uniqueCodes}개 오류 코드</p>
</body></html>`;

  const htmlPath = path.join(REPORT_DIR, "ts-strict-report.html");
  fs.writeFileSync(htmlPath, html);
  console.log(`📄 HTML report: ${htmlPath}`);
}

// Console summary
console.log("\n═══════════════════════════════════");
console.log(` 🔢  총 오류: ${report.totalErrors}`);
console.log(` 📁  영향받은 파일: ${report.uniqueFiles}`);
console.log(` 🏷️  오류 코드 종류: ${report.uniqueCodes}`);
console.log("───────────────────────────────────");
console.log(" 상위 파일:");
topFiles.slice(0, 5).forEach(([f, errs]) => {
  console.log(`   ${f} — ${errs.length}개`);
});
console.log("───────────────────────────────────");
console.log(" 상위 오류 코드:");
topCodes.slice(0, 5).forEach(([code, errs]) => {
  console.log(`   ${code} — ${errs.length}회`);
});
console.log("═══════════════════════════════════\n");

if (countOnly) {
  console.log(`TS_STRICT_TOTAL=${report.totalErrors}`);
  console.log(`TS_STRICT_FILES=${report.uniqueFiles}`);
}
