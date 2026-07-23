# 추천인(레퍼럴) 프로그램 API 명세

## 1. 코드 생성 / 조회

### `POST /api/referrals/generate`
**인증**: 필수 (X-API-Key 또는 Bearer Token)

로그인한 사용자의 추천인 코드를 생성합니다. 이미 코드가 있으면 기존 코드를 반환합니다.

**응답 200**:
```json
{
  "code": "A1234별",
  "referral_code_id": "uuid-string"
}
```

### `GET /api/referrals/my-code`
**인증**: 필수

내 추천인 코드를 조회합니다.

**응답 200**:
```json
{
  "code": "A1234별",
  "referral_code_id": "uuid-string"
}
```
**응답 404**: 코드가 없을 때
```json
{"detail": "추천인 코드가 없습니다. 먼저 코드를 생성해주세요."}
```

---

## 2. 회원가입 시 추천인 연결

### `POST /api/auth/verify-code`
기존 요청에 `referral_code`(optional) 필드가 추가되었습니다.

**요청**:
```json
{
  "phone": "821012345678",
  "code": "123456",
  "referral_code": "A1234별"    // optional
}
```

**referral_code 검증 규칙**:
- 존재하지 않는 코드 → 400 Bad Request
- 자기 자신 코드 사용 → 400 Bad Request
- 이미 referred_by가 있는 테넌트는 무시 (변경 안 함)
- 정상 → 회원가입 완료 후 해당 tenant.referred_by에 referral_code.id 저장

---

## 3. 추천인 대시보드

### `GET /api/referrals/dashboard`
**인증**: 필수

본인이 추천한 회원 목록과 커미션 현황을 조회합니다.

**응답 200**:
```json
{
  "my_code": "A1234별",
  "referral_code_id": "uuid-string",
  "referred_users": [
    {
      "tenant_id": "uuid",
      "phone": "821099999999",
      "plan": "pro",
      "has_paid": true,
      "joined_at": "2026-07-20T00:00:00"
    }
  ],
  "pending_commission_total": 1500,
  "paid_commission_total": 500
}
```

---

## 4. 관리자: Pending 커미션 목록

### `GET /api/referrals/admin/pending`
**인증**: Admin Bearer Token 필수

전체 pending 상태의 커미션 목록을 반환합니다.

**응답 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "referrer_id": "uuid",
      "referrer_phone": "821011111111",
      "referred_user_phone": "821022222222",
      "source_type": "usdt",
      "amount": 10000,
      "commission_rate": 0.1,
      "commission_amount": 1000,
      "created_at": "2026-07-20T00:00:00"
    }
  ],
  "total_count": 1
}
```

---

## 5. 관리자: 커미션 지급 완료 처리

### `POST /api/referrals/admin/{commission_id}/mark-paid`
**인증**: Admin Bearer Token 필수

해당 커미션을 `paid` 상태로 변경합니다. (실제 송금은 안 함 — 기록만)

**응답 200**:
```json
{
  "success": true,
  "message": "커미션이 지급 완료 처리되었습니다."
}
```
**응답 400**: 이미 지급된 커미션
```json
{"detail": "이미 지급 완료된 커미션입니다."}
```
**응답 404**: 존재하지 않는 커미션
```json
{"detail": "해당 커미션을 찾을 수 없습니다."}
```

---

## 6. 커미션 계산

### Stars 결제 시 (`POST /api/billing/stars/spend`)
- 사용자의 `referred_by`가 있으면 `referral_commissions`에 pending 기록
- `commission_rate` = 0.10 (10%), 상수는 `app/api/referrals.py`의 `COMMISSION_RATE`와 `app/services/referral.py`의 `COMMISSION_RATE`에서 관리

### USDT 입금 확인 시 (`usdt_watcher.py` / `confirm_usdt_payment`)
- 동일하게 `referred_by`가 있는 결제자에 대해 커미션 기록
- source_type: `"usdt"` 또는 `"stars"`
- 절대 실제 송금/이체하지 않음 (pending 기록만)

---

## 데이터베이스 테이블

### `referral_codes`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| code | VARCHAR(30) UNIQUE INDEX | 영문+숫자+한글 조합 |
| owner_id | VARCHAR(36) FK->tenants.id | 코드 소유자 |
| created_at | DATETIME | 생성일 |

### `referral_commissions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| referrer_id | VARCHAR(36) FK->tenants.id | 추천인 |
| referred_user_id | VARCHAR(36) FK->tenants.id | 추천된 사용자 |
| source_payment_id | VARCHAR(36) | 결제 ID/tx_hash |
| source_type | VARCHAR(10) | "stars" 또는 "usdt" |
| amount | INTEGER | 결제 금액 (원래 금액) |
| commission_rate | FLOAT | 수수료율 (0.10) |
| commission_amount | INTEGER | 실제 커미션 금액 |
| status | VARCHAR(20) | "pending" 또는 "paid" |
| created_at | DATETIME | 생성일 |

### `tenants` (변경됨)
| 컬럼 | 설명 |
|------|------|
| referred_by | VARCHAR(36) nullable, 기존 컬럼 |
| referral_code | VARCHAR(20) UNIQUE, 기존 컬럼 (새 ReferralCode 테이블과 별도로 유지) |
| referral_earnings | INTEGER default 0, 기존 컬럼 |
