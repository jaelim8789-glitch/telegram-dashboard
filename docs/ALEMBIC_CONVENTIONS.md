# Alembic Migration Conventions

## Revision ID 충돌 방지

**마이그레이션은 반드시 `alembic revision --autogenerate -m "<메시지>"` 명령으로만 생성한다.**

- 수동으로 revision ID를 직접 타이핑하지 않는다 — 자동 생성된 ID를 그대로 사용.
- `--autogenerate`가 감지하지 못하는 변경(`rename`, `schema` 등)은 수동 migration 파일을 작성하되 revision ID는 `alembic revision`으로 먼저 생성한 후 채운다.

```bash
# 올바른 예
alembic revision --autogenerate -m "add_broadcast_schedule"

# 잘못된 예 (수동 ID 생성 금지)
# alembic revision -m "add_broadcast_schedule"  ← --autogenerate 누락
# 수동으로 revision ID를 편집  ← 금지
```

## 멀티헤드 방지

**한 브랜치에 2개 이상의 head가 존재하는 상태로 커밋할 수 없다.**

- pre-commit 훅이 `alembic heads` 결과를 검사하여 1줄(단일 head)인지 확인하고, 멀티헤드면 커밋을 차단한다.
- 멀티헤드 발생 시 반드시 `alembic merge`로 병합 후 커밋한다.

```bash
# 멀티헤드 해소
alembic heads                     # 현재 head 목록 확인
alembic merge -m "merge heads" <head1_revision> <head2_revision>
```

## CI에서의 마이그레이션 검증

- Backend CI는 Postgres 서비스 컨테이너에서 `alembic upgrade head`를 실행하여 마이그레이션이 정상 동작하는지 검증한다.
- CI 실패 시 배포가 차단된다.

## 참고

- Async SQLAlchemy 사용 — `alembic/env.py`에서 `async_engine_from_config`로 엔진 생성.
- `alembic_version.version_num` 컬럼은 VARCHAR(255)로 확장되어 병합 revision ID를 수용.
