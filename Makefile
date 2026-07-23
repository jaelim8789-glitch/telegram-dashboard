.PHONY: dev dev-backend dev-frontend build build-backend build-frontend \
        typecheck lint clean reset-ci reset-full test test-e2e \
        deploy deploy-staging health-check worktree-status \
        db-up db-down db-reset logs logs-backend logs-frontend \
        sentry-check env-check

# ─── 개발 서버 ──────────────────────────────────────────────────────

## 전체 개발 스택 실행
dev:
	cd telegram-dashboard-backend && docker compose --profile full up -d
	pnpm dev

## 백엔드만 실행 (프론트는 pnpm dev)
dev-backend:
	cd telegram-dashboard-backend && docker compose --profile backend-only up -d

## 프론트만 실행 (백엔드는 별도)
dev-frontend:
	pnpm dev

# ─── 빌드 ────────────────────────────────────────────────────────────

build:
	pnpm build

build-backend:
	cd telegram-dashboard-backend && docker compose build backend

# ─── 검사 ────────────────────────────────────────────────────────────

typecheck:
	pnpm typecheck

lint:
	pnpm lint

sentry-check:
	scripts/sentry-error-dashboard.sh --deploy-check

env-check:
	scripts/check-env-sync.sh
	scripts/check-env-sync.sh backend

# ─── 정리 ────────────────────────────────────────────────────────────

## 캐시+노드모듈+빌드 찌꺼기 완전 초기화 (pnpm store은 보존)
clean:
	rm -rf .next node_modules
	pnpm store prune
	echo "✅ Clean complete — run 'pnpm install' to reinstall"

## DB 포함 완전 초기화
clean-all: clean
	cd telegram-dashboard-backend && docker compose down -v
	rm -rf telegram-dashboard-backend/__pycache__ telegram-dashboard-backend/app/**/__pycache__
	echo "✅ Full clean — run 'make dev' to start fresh"

# ─── 테스트 ──────────────────────────────────────────────────────────

test:
	pnpm test:e2e

# ─── 배포 ────────────────────────────────────────────────────────────

## 스테이징 배포 (SSH 키 필요)
deploy-staging:
	cd telegram-dashboard-backend && docker compose build frontend
	ssh $(VPS_HOST) "cd /opt/telemon/backend && git pull && docker compose up -d --no-deps frontend"

## 스모크 테스트
smoke-test:
	scripts/smoke_test_prod.sh

# ─── 워크트리 ─────────────────────────────────────────────────────────

worktree-status:
	scripts/worktree-dashboard.sh

# ─── Docker DB ────────────────────────────────────────────────────────

db-up:
	cd telegram-dashboard-backend && docker compose up -d db

db-down:
	cd telegram-dashboard-backend && docker compose stop db

db-reset:
	cd telegram-dashboard-backend && docker compose down -v db && docker compose up -d db

# ─── 로그 ────────────────────────────────────────────────────────────

logs:
	cd telegram-dashboard-backend && docker compose logs -f --tail=50

logs-backend:
	cd telegram-dashboard-backend && docker compose logs -f backend --tail=50

logs-frontend:
	cd telegram-dashboard-backend && docker compose logs -f frontend --tail=50

# ─── 헬스 체크 ──────────────────────────────────────────────────────

health-check:
	scripts/vps-health-check.sh

# ─── 도움말 ──────────────────────────────────────────────────────────

help:
	@echo "TeleMon Makefile — 자주 쓰는 명령 모음"
	@echo ""
	@grep -E '^## |^[a-zA-Z_-]+:' Makefile | while read line; do \
		if echo "$$line" | grep -q '^## '; then \
			echo "  $$line" | sed 's/## /  /'; \
		else \
			echo "    $$line" | sed 's/://'; \
		fi; \
	done
