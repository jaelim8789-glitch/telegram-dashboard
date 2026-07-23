# 시크릿 로테이션 절차

> 이 문서는 TeleMon 프로덕션 시크릿(비밀키, 암호화 키, API 토큰)을 정기적으로 교체하는 절차를 정의합니다.
> 권장 주기: **90일** (분기마다) 또는 보안 사고 발생 시 즉시.

---

## 1. 시크릿 인벤토리

| 시크릿 | 위치 | 영향 범위 | 로테이션 방법 |
|--------|------|-----------|---------------|
| `JWT_SECRET_KEY` | backend `.env` | 모든 JWT 토큰 무효화 | 재생성 → 재배포 → 전체 사용자 재로그인 |
| `ADMIN_JWT_SECRET` | backend `.env` | 관리자 JWT 토큰 무효화 | 재생성 → 재배포 |
| `ENCRYPTION_KEY` | backend `.env` | 저장된 모든 Telegram 세션 | **신중히**: 기존 세션 복호화 불가 → 재인증 필요 |
| `TELEGRAM_BOT_TOKEN` | backend `.env` | 봇 기능 전체 | @BotFather에서 재발급 → .env 업데이트 |
| `NOWPAYMENTS_API_KEY` | backend `.env` | 결제 연동 | NOWPayments 대시보드에서 재발급 |
| `ADMIN_PASSWORD` | backend `.env` | 관리자 로그인 | 변경 후 .env 업데이트 |
| `TWILIO_AUTH_TOKEN` | backend `.env` | SMS 발송 | Twilio 콘솔에서 재발급 |

---

## 2. 로테이션 절차

### 2.1 JWT_SECRET_KEY (90일)

```bash
# 1. 새 시크릿 생성
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 2. backend .env 업데이트
#    vi telegram-dashboard-backend/.env  → JWT_SECRET_KEY=새값

# 3. 재배포
cd /opt/telemon/backend
docker compose up -d --no-deps backend

# 4. 검증
curl -s -o /dev/null -w "%{http_code}" https://api.telemon.online/api/auth/me
# → 401: 정상 (기존 JWT 무효화)
# → 신규 로그인 후 200 확인
```

### 2.2 ENCRYPTION_KEY (비상시에만)

> **경고**: ENCRYPTION_KEY를 바꾸면 모든 기존 Telegram 세션을 복호화할 수 없습니다.  
> 모든 사용자가 계정을 재인증해야 합니다.

```bash
# 1. 새 키 생성
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 2. 점진적 마이그레이션 전략
#    - 기존 키로 세션 복호화 → 새 키로 재암호화 → DB 업데이트
#    - 아래 스크립트 실행:
cd /opt/telemon/backend
docker compose exec backend python scripts/reencrypt_sessions.py

# 3. .env에 새 키 적용 후 재배포
```

### 2.3 ADMIN_PASSWORD / ADMIN_JWT_SECRET

```bash
# 1. 새 암호/시크릿 생성
ADMIN_PASSWORD: python -c "import secrets; print(secrets.token_urlsafe(16))"
ADMIN_JWT_SECRET: python -c "import secrets; print(secrets.token_urlsafe(48))"

# 2. .env 업데이트 후 재배포
vi telegram-dashboard-backend/.env
docker compose up -d --no-deps backend
```

### 2.4 TELEGRAM_BOT_TOKEN

```bash
# 1. @BotFather → /mybots → Choose bot → API Token → Revoke → 새 토큰 복사

# 2. .env 업데이트
vi telegram-dashboard-backend/.env

# 3. 재배포
docker compose up -d --no-deps backend

# 4. 봇 정상 동작 확인
docker compose logs backend | grep "bot"
```

---

## 3. 자동화 스크립트

### 3.1 시크릿 만료 알림

```bash
# scripts/check-secret-expiry.sh — .env 시크릿 생성일 기준 90일 초과 알림
grep -E "^(JWT_SECRET_KEY|ENCRYPTION_KEY|ADMIN_JWT_SECRET)=" .env
# 파일 수정 시간 확인:
stat -c '%y' telegram-dashboard-backend/.env
```

### 3.2 긴급 로테이션 (보안 사고 시)

```bash
# scripts/rotate-all-secrets.sh — 모든 시크릿 일괄 교체 (주의: 다운타임 발생)
./scripts/rotate-all-secrets.sh
```
