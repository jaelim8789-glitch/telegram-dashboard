<!-- FRONTEND REPO NOTICE -->
> [!NOTE]
> 🌐 **이 저장소는 프론트엔드 전용입니다**  
> 백엔드: `telegram-dashboard-backend` 저장소  
> 혼동 방지를 위해 각각의 기능이 분리되어 있습니다.

![CI](https://github.com/jaelim8789-glitch/telegram-dashboard/actions/workflows/deploy.yml/badge.svg)

<!-- END FRONTEND REPO NOTICE -->

# Telegram Management Dashboard — Frontend

Next.js 15 + TypeScript + Tailwind + Zustand 대시보드입니다. 전체 프로젝트 개요, 설치·실행·배포 방법은
[`telegram-dashboard-backend/README.md`](../telegram-dashboard-backend/README.md)에 정리되어 있습니다 — 이 문서는
프론트엔드만 따로 만질 때 필요한 내용만 다룹니다.

## 개발 시작 절차

**AI 에이전트(신규)는 여기 대신 [docs/ONBOARDING.md](docs/ONBOARDING.md)에서 시작하세요** — 5분 안에 첫 커밋까지 가는 요약본입니다. 이 섹션은 그 축약판입니다.

1. **자신에게 할당된 워크트리로 이동** — 이 프로젝트는 [Worktree 기반으로만 개발](WORKTREE_WORKFLOW.md)합니다. `c:\Dev\TeleMon`(parent, `master`) 자체에서는 개발하지 않습니다. 워크트리·브랜치 매핑은 [AGENTS.md](AGENTS.md#worktree-based-workflow-mandatory) 참고.
2. `npm install`
3. 백엔드가 필요하면 `telegram-dashboard-backend/`를 별도로 기동(호스트 또는 Docker) — 아래 "로컬 개발" 참고.
4. `npm run dev`로 확인하며 작업, 완료 시 자신의 고정 브랜치(`worktree/<agent>`)에 commit → push.
5. Merge/Test/Deploy는 `TeleMon-release` 워크트리에서만 수행합니다 — 개발 워크트리에서 직접 하지 않습니다.

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

## Deployment Notes

운영자가 프론트엔드를 재배포하기 전/후 반드시 확인해야 하는 사항입니다. 실제 배포 절차는
이 저장소의 [AGENTS.md "Production deployment"](AGENTS.md#production-deployment) 섹션을 따르되, 아래는
그 과정에서 실제로 발목을 잡았던 항목들입니다.

- **Docker build context 검증 필수** — 루트 `app/`, `backend/` 디렉터리가 프론트엔드 빌드에
  섞여 들어가면 사이트 전체가 조용히 404가 됩니다 (에러 없이 "빌드 성공"으로 표시됨). 자세한
  원인과 `.dockerignore` 설정은 [`docs/deployment/known-issues.md`](docs/deployment/known-issues.md) 참고.
  **빌드 후 반드시 `Route (app)` 테이블이 로그에 출력되는지, 배포된 사이트가 실제 200을
  반환하는지 확인할 것** — 컨테이너가 "Up"이어도 라우트가 0개일 수 있습니다.
- **배포 후 헬스체크가 `starting`에 머물러도 당황하지 말 것** — 컨테이너 내부 `wget`이
  `localhost`를 IPv6(`::1`)로 먼저 시도하다 실패하는 기존 Dockerfile의 사소한 결함으로,
  실제 서비스 정상 동작과는 무관합니다. `curl -H "Host: app.telemon.online" https://<서버>/`
  같은 외부 HTTP 확인으로 실제 상태를 판단하세요.
- **모바일 UI 변경 시** [`docs/mobile/mobile-optimization.md`](docs/mobile/mobile-optimization.md)에
  정리된 기존 대응(dvh, bottom sheet, 44px 터치 타깃, short label, 반응형 토스트 등) 패턴을
  따르고, 회귀시키지 않도록 확인하세요.
- **재배포 전 origin/master 최신 상태 확인** — 이 저장소(`telegram-dashboard`)와
  `telegram-dashboard-backend`는 완전히 분리된 별도 git 저장소입니다. 프론트엔드만 배포할
  때도 두 저장소 각각의 `git log` / `git status`를 확인해 의도치 않은 커밋이 섞여 배포되지
  않도록 합니다.