# Telegram Management Dashboard — Frontend

Next.js 15 + TypeScript + Tailwind + Zustand 대시보드입니다. 전체 프로젝트 개요, 설치·실행·배포 방법은
[`telegram-dashboard-backend/README.md`](../telegram-dashboard-backend/README.md)에 정리되어 있습니다 — 이 문서는
프론트엔드만 따로 만질 때 필요한 내용만 다룹니다.

## 로컬 개발 (프론트엔드만)

백엔드가 이미 (호스트에서든 Docker에서든) `http://localhost:8000`에 떠 있다는 전제하에:

```bash
npm install
npm run dev
```

`http://localhost:3000` (포트가 사용 중이면 Next.js가 자동으로 다른 포트를 씀) 접속. API 주소는
`.env.local`의 `NEXT_PUBLIC_API_BASE_URL`로 지정합니다 (기본값 `http://localhost:8000`).

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`output: "standalone"`, Docker 이미지에 사용) |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright E2E (`e2e/`) — 실제 백엔드+DB가 떠 있어야 함, 자세한 내용은 메인 README 참고 |

## 디렉터리

- `src/app` — Next.js App Router 엔트리
- `src/components` — 레이아웃(`layout/`), 워크스페이스 탭(`workspace/`), 사이드바(`sidebar/`), 공용 UI(`ui/`)
- `src/store` — Zustand 전역 상태
- `src/lib/api.ts` — 백엔드 API 클라이언트
- `e2e/` — Playwright E2E 스펙 (계정/발송/로그 전체 흐름)
