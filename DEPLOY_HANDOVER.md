# TeleMon 배포/서버관리 인수인계 문서 (Claude → Kiro, 2026-07-22)

## 1. 접속 정보

- **VPS SSH**: `ssh telemon-vps` (SSH config alias 등록되어 있음, 130.94.32.152 / root)
- **프론트엔드 리포**: https://github.com/jaelim8789-glitch/telegram-dashboard
- **백엔드 리포**: https://github.com/jaelim8789-glitch/telegram-dashboard-backend
- **VPS 파일 위치**:
  - 프론트엔드 소스: `/opt/telemon/telegram-dashboard`
  - 백엔드 소스 + docker-compose: `/opt/telemon/backend`
- **도메인**: `app.telemon.online`(프론트), `api.telemon.online`(백엔드 API), `telemon.online`(랜딩)

## 2. 표준 배포 절차 (매번 이대로)

```bash
# 1. 프론트엔드 배포
ssh telemon-vps "cd /opt/telemon/telegram-dashboard && git pull origin master"
ssh telemon-vps "cd /opt/telemon/backend && docker compose build frontend"
ssh telemon-vps "cd /opt/telemon/backend && docker compose up -d --no-deps frontend"
ssh telemon-vps "cd /opt/telemon/backend && docker compose restart nginx"   # 컨테이너 재생성 후 필수!

# 2. 백엔드 배포 (백엔드 코드 변경 시)
ssh telemon-vps "cd /opt/telemon/backend && git pull origin master"
ssh telemon-vps "cd /opt/telemon/backend && docker compose build backend"
ssh telemon-vps "cd /opt/telemon/backend && docker compose up -d --no-deps backend"

# 3. 확인
curl https://app.telemon.online/health
curl https://api.telemon.online/health
ssh telemon-vps "docker ps --format '{{.Names}} {{.Status}}'"
```

**⚠️ nginx 재시작을 절대 빼먹지 말 것** — frontend/backend 컨테이너를 재생성(recreate)하면 내부 IP가 바뀌는데, nginx가 예전 IP를 캐싱하고 있어서 재시작 안 하면 502 에러 남.

## 3. GitHub Actions CI/CD (참고만, 실제 배포는 위 수동 절차 사용)

- `.github/workflows/deploy.yml`이 push마다 자동으로 빌드/typecheck는 돌지만, **`deploy-frontend-production`/`deploy-frontend-staging` job은 실패함** — VPS의 `docker-compose.yml`이 아직 이미지(pull) 방식이 아니라 소스 빌드 방식이라 `scripts/zero-downtime-deploy.sh`를 못 찾음. 이게 근본적으로 안 고쳐진 상태라, **항상 위 2번의 수동 SSH 절차로 배포해야 함**.
- CI에서 `frontend-build`/`frontend-docker`가 ✓(성공)인 걸 확인 후에만 위 수동 배포 진행할 것 — CI가 실패하면 진짜 코드 버그가 있다는 뜻.

## 4. 오늘 반복적으로 터진 문제들 (재발 방지용)

1. **인코딩 손상 (제일 자주 발생)**: 한글 파일이 CP949/EUC-KR로 저장된 걸 UTF-8로 잘못 읽어서 `�` 문자나 빌드 파싱 에러로 나타남. `grep -rl "�" src/`로 찾고, `file <경로>`로 "ISO-8859" 나오면 의심. 복구법: PowerShell로 CP949→UTF-8 재변환 (`[System.Text.Encoding]::GetEncoding(949)`) — 단, 이미 `�`(U+FFFD)가 박혀있으면 데이터 이미 유실된 거라 재변환 안 되고 수동 복구해야 함.
2. **`.ts` 파일에 JSX 넣는 실수**: JSX 쓰는 파일은 반드시 `.tsx`. `next build` 에러에 "Parsing error: '>' expected" 뜨면 이거 의심.
3. **`next.config.ts`의 `eslint.ignoreDuringBuilds`/`typescript.ignoreBuildErrors`가 자꾸 없어짐**: 여러 명이 이 파일 동시에 건드려서 자주 사라짐. 없으면 프로덕션 빌드가 사소한 타입/린트 에러로도 막힘. 다시 넣어줘야 함 (단, 임시방편이니 진짜 에러들은 별도로 고쳐야 함).
4. **DB 커넥션 풀 고갈**: `telegram-dashboard-backend/app/services/auto_reply_service.py`가 DB 세션을 네트워크 호출(AI/텔레그램 API) 동안 계속 들고 있으면 메시지 몰릴 때 풀 고갈됨 → API 전체가 느려짐/멈춤. 오늘 세션 스코프 줄이는 리팩터링 완료(`4fca0b0`), 재발하면 `docker compose restart backend`로 즉시 완화하고 `app/database.py`의 `pool_size`/`max_overflow` 확인.
5. **여러 에이전트 동시 작업 충돌**: 같은 파일(특히 `AppShell.tsx`, `api.ts`, `SendTab.tsx`) 동시 편집하면 깨짐. 반드시 `git worktree add`로 격리해서 작업.

## 5. 배포 전 필수 체크리스트

```bash
cd <repo>
npx tsc --noEmit -p tsconfig.json   # 에러 있으면 원인 파악 (ignoreBuildErrors로 가려지긴 하지만 확인은 할 것)
npx next build                       # 실제 빌드 통과하는지 (Windows 로컬이면 symlink EPERM 경고는 무시 가능, "Compiled successfully"만 확인)
git log HEAD..origin/master --oneline   # push 전 항상 새 커밋 있는지 확인
```

## 6. 지금 미해결/진행 중인 것

- 디자인 5개 브랜치(색상테마/매크로에디터/채팅관리/분석대시보드/계정관리+AI비서) master에 병합 완료(`16b852e`), 이제 CI 결과 대기 중 → 통과하면 위 2번 절차로 배포
- 미병합 브랜치 78개 중 "merge 후보 13개"는 아직 검토 중 (`BRANCH_AUDIT.md` 참고)
- `AutoReplyTab.tsx`에 조건부 Hook 호출 버그 있음 (진짜 버그, ignoreBuildErrors로 가려져 있을 뿐) — 나중에 고쳐야 함

## 7. AGENTS.md도 꼭 참고

리포 루트의 `AGENTS.md`에 "2026-07-22 회고: 최우선 3가지 + 전체 규칙" 섹션에 오늘 겪은 문제들과 대응 방법이 다 정리되어 있음. 새 작업 시작 전에 한 번 읽을 것.
