# TeleMon DevOps Scripts

## 환경 동기화

```bash
# .env와 .env.example 간 누락 키 감지
./scripts/check-env-sync.sh          # frontend
./scripts/check-env-sync.sh backend  # backend
./scripts/check-env-sync.sh --fix    # 누락키 자동 추가
```

## Docker Compose (프로파일 기반)

```bash
# 프로덕션 (backend 폴더 기준)
cd telegram-dashboard-backend

# 전체 스택 실행 (기본)
docker compose --profile full up -d

# 프론트만 실행 (백엔드 개발 중)
docker compose --profile frontend-only up -d

# 백엔드만 실행 (프론트 개발 중)
docker compose --profile backend-only up -d
```

## 워크트리 대시보드

```bash
# 모든 워크트리 상태 한눈에
./scripts/worktree-dashboard.sh

# 실시간 감시 (5초 갱신)
./scripts/worktree-dashboard.sh --watch

# JSON 출력 (파싱용)
./scripts/worktree-dashboard.sh --json
```

## Sentry 에러 대시보드

```bash
# 사전 준비: Sentry Auth Token 발급
export SENTRY_AUTH_TOKEN="your_token"
export SENTRY_ORG="telemon"
export SENTRY_PROJECT="telemon-nextjs"

# 오늘 에러 요약
./scripts/sentry-error-dashboard.sh

# 실시간 감시 (30초 갱신)
./scripts/sentry-error-dashboard.sh --watch

# 배포 전 안전성 확인
./scripts/sentry-error-dashboard.sh --deploy-check

# 임계치 알림 (예: 1시간 내 50건 초과 시 exit 1)
./scripts/sentry-error-dashboard.sh --alert 50
```

## VPS 상태 체크

```bash
# 단일 체크
./scripts/vps-health-check.sh

# 데몬 모드 (60초 간격)
./scripts/vps-health-check.sh --daemon

# 웹훅 알림 (Slack/Discord)
./scripts/vps-health-check.sh --webhook https://hooks.slack.com/services/...

# 환경변수로 임계치 설정
VPS_CPU_THRESHOLD=85 VPS_MEM_THRESHOLD=85 ./scripts/vps-health-check.sh
```

## 시크릿 로테이션

절차 문서: [docs/SECRET_ROTATION.md](../docs/SECRET_ROTATION.md)
