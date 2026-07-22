#!/usr/bin/env node
// port-conflict-check.mjs — 포트 충돌 자동 확인
import { createServer } from "net";

const PORTS = [3000, 8000, 6006];

function checkPort(port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.on("error", () => resolvePromise({ port, available: false }));
    server.on("listening", () => {
      server.close();
      resolvePromise({ port, available: true });
    });
    server.listen(port, "127.0.0.1");
  });
}

console.log("\x1b[36m=== 포트 충돌 검사 ===\x1b[0m\n");

const results = await Promise.all(PORTS.map(checkPort));
let hasConflict = false;

for (const r of results) {
  const label = r.port === 3000 ? "Next.js (3000)" : r.port === 8000 ? "FastAPI (8000)" : "Storybook (6006)";
  if (r.available) {
    console.log(`  \x1b[32m✅ ${label} — 사용 가능\x1b[0m`);
  } else {
    console.log(`  \x1b[31m❌ ${label} — 충돌! 다른 프로세스가 사용 중\x1b[0m`);
    if (r.port === 3000) {
      console.log(`     \x1b[33m   해결: npm run dev -- -p 3001 로 대체 포트 사용\x1b[0m`);
    } else if (r.port === 8000) {
      console.log(`     \x1b[33m   해결: netstat -ano | findstr :8000 으로 PID 확인 후 taskkill\x1b[0m`);
    }
    hasConflict = true;
  }
}

if (hasConflict) {
  console.log(`\n\x1b[33m⚠️  포트 충돌이 있습니다. 위 해결 방법을 참고하세요.\x1b[0m`);
} else {
  console.log(`\n\x1b[32m✅ 모든 포트 사용 가능\x1b[0m`);
}
