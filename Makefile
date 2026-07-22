# TeleMon 프로젝트를 위한 Makefile
.PHONY: dev test deploy-check clean install build analyze

# 개발 서버 시작
dev:
	@echo "프론트엔드 및 백엔드 개발 서버를 시작합니다..."
	@concurrently "cd $(CURDIR) && npm run dev" "cd $(CURDIR)/backend && python -m uvicorn main:app --reload --port 8000"

# 테스트 실행
test:
	@echo "모든 테스트를 실행합니다..."
	@npm run test
	@cd backend && python -m pytest tests/

# 배포 전 검사
deploy-check:
	@echo "배포 전 검사를 실행합니다..."
	@npm run lint
	@npm run build
	@cd backend && python -m pytest tests/
	@cd backend && python -m mypy .

# 종속성 설치
install:
	@echo "프론트엔드 종속성을 설치합니다..."
	@npm install
	@echo "백엔드 종속성을 설치합니다..."
	@cd backend && pip install -r requirements.txt

# 빌드
build:
	@echo "프론트엔드를 빌드합니다..."
	@npm run build
	@echo "백엔드를 빌드합니다..."
	@cd backend && python -m compileall .

# 번들 분석
analyze:
	@echo "번들 분석을 실행합니다..."
	@npm run build --analyze

# 정리
clean:
	@echo "빌드 산출물을 정리합니다..."
	@rm -rf .next dist build
	@cd backend && rm -rf __pycache__ *.pyc

# 터널 테스트 (ngrok 필요)
tunnel:
	@echo "로컬 터널을 시작합니다 (ngrok 필요)..."
	@ngrok http 8000

# 스냅샷 테스트
snapshot-test:
	@echo "스냅샷 테스트를 실행합니다..."
	@npm run test -- --updateSnapshot

# i18n 키 검사
check-i18n:
	@echo "i18n 키 완결성을 검사합니다..."
	@node scripts/check-i18n-keys.js

# 포트 충돌 확인 및 처리
check-port:
	@echo "포트 사용 상태를 확인합니다..."
	@netstat -an | grep :3000 || echo "Port 3000 is available"
	@netstat -an | grep :8000 || echo "Port 8000 is available"