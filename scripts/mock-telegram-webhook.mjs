#!/usr/bin/env node
// mock-telegram-webhook.mjs — 로컬 텔레그램 웹훅 mock 서버
import { createServer } from "http";

const PORT = parseInt(process.argv[2]) || 9000;

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;

    console.log(`\n\x1b[36m[${timestamp}] ${method} ${url}\x1b[0m`);

    if (body) {
      try {
        const parsed = JSON.parse(body);
        console.log(`  Payload: ${JSON.stringify(parsed, null, 2).slice(0, 500)}`);
      } catch {
        console.log(`  Body: ${body.slice(0, 200)}`);
      }
    }

    // webhook 응답 모방
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: { message_id: Math.floor(Math.random() * 100000) } }));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n\x1b[32m=== 텔레그램 웹훅 Mock 서버 ===\x1b[0m`);
  console.log(`  포트: ${PORT}`);
  console.log(`  엔드포인트: POST http://127.0.0.1:${PORT}/webhook`);
  console.log(`  \x1b[90m종료: Ctrl+C\x1b[0m\n`);
});
