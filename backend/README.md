<!-- BACKEND REPO NOTICE -->
> [!NOTE]
> 🛠️ **이 저장소는 백엔드 전용입니다**  
> 프론트엔드: `telegram-dashboard` 저장소  
> 혼동 방지를 위해 각각의 기능이 분리되어 있습니다.

<!-- END BACKEND REPO NOTICE -->

# Telegram Management Dashboard — Backend

FastAPI 기반의 백엔드 서버입니다. 이 저장소는 프론트엔드(`telegram-dashboard`)와 분리된 별도의 저장소입니다.

## 개요

이 백엔드 서버는 다음 기능들을 제공합니다:

- Telegram 봇 API 통합
- 사용자 인증 및 계정 관리
- 메시지 발송 및 자동 회신
- 브로드캐스트 캠페인
- 데이터베이스 관리
- 결제 시스템 통합(Cryptomus, Stars)

## 설치 및 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 데이터베이스 마이그레이션
alembic upgrade head

# 서버 실행
python -m uvicorn main:app --reload --port 8000
```

## 디렉토리 구조

- `bot/` - Telegram 봇 통합 로직
- `routers/` - API 엔드포인트
- `models.py` - 데이터베이스 모델
- `auth_middleware.py` - 인증 미들웨어
- `account_runtime.py` - 계정 런타임 관리
- `tests/` - 테스트 파일

## API 엔드포인트

주요 API 엔드포인트는 `/docs`에서 확인할 수 있습니다.

## 협업 규칙

- 모든 PR은 적어도 1명 이상의 리뷰어 승인 후 병합
- 중요한 변경사항은 관련 테스트 포함 필수
- 데이터베이스 변경은 Alembic 마이그레이션으로 관리