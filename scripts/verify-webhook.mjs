#!/usr/bin/env node
// verify-webhook.mjs — 배포 웹훅 알림 동작 검증
// 실제로 secrets.ALERT_WEBHOOK_URL이 설정되어 있고 응답하는지 확인
const https = require("https");
const http = require("http");

const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || process.argv[2];

if (!WEBHOOK_URL) {
  console.log("\x1b[33m⚠️  ALERT_WEBHOOK_URL이 설정되지 않았습니다.\x1b[0m");
  console.log("  사용법: node scripts/verify-webhook.mjs <webhook_url>");
  console.log("  또는:  ALERT_WEBHOOK_URL=... node scripts/verify-webhook.mjs");
  process.exit(0);
}

const payload = JSON.stringify({
  text: "✅ [verify-webhook] TeleMon CI 웹훅 테스트 메시지",
  username: "TeleMon CI",
  icon_emoji: ":test_tube:",
});

const url = new URL(WEBHOOK_URL);
const client = url.protocol === "https:" ? https : http;

const req = client.request(
  url,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
    timeout: 10000,
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`\x1b[32m✅ 웹훅 전송 성공 (HTTP ${res.statusCode})\x1b[0m`);
        console.log(`  응답: ${body.slice(0, 200)}`);
        process.exit(0);
      } else {
        console.log(`\x1b[31m❌ 웹훅 실패 (HTTP ${res.statusCode})\x1b[0m`);
        console.log(`  응답: ${body.slice(0, 200)}`);
        process.exit(1);
      }
    });
  }
);

req.on("error", (e) => {
  console.log(`\x1b[31m❌ 웹훅 연결 실패: ${e.message}\x1b[0m`);
  process.exit(1);
});

req.write(payload);
req.end();
