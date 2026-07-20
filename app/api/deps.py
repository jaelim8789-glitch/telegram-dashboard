from dataclasses import dataclass
from typing import Literal

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token, decode_user_id_from_token
from app.crud import user as user_crud
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User


@dataclass
class Identity:
    kind: Literal["admin", "api_key", "user"]
    user: User | None = None
    tenant: Tenant | None = None
    tenant_id: str | None = None


async def require_admin(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="관리자 로그인이 필요합니다.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        if not decode_access_token(token):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않거나 만료된 토큰입니다.")


async def _resolve_tenant_by_phone(db: AsyncSession, phone: str) -> Tenant | None:
    result = await db.execute(select(Tenant).where(Tenant.phone == phone))
    return result.scalar_one_or_none()


async def _resolve_identity(
    x_api_key: str | None,
    authorization: str | None,
    db: AsyncSession,
) -> Identity | None:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            if decode_access_token(token):
                return Identity(kind="admin")
        except jwt.PyJWTError:
            pass
        try:
            user_id = decode_user_id_from_token(token)
        except jwt.PyJWTError:
            user_id = None
        if user_id:
            user = await user_crud.get_user(db, user_id)
            if user is not None and user.is_active:
                tenant = await _resolve_tenant_by_phone(db, user.phone)
                if tenant:
                    return Identity(kind="user", user=user, tenant=tenant, tenant_id=tenant.id)
                return Identity(kind="user", user=user)

    if x_api_key:
        from app.crud import api_key as api_key_crud
        key_row = await api_key_crud.get_by_key(db, x_api_key)
        if key_row is not None and key_row.is_active:
            await api_key_crud.touch_last_used(db, key_row)
            return Identity(kind="api_key")

    return None


async def require_api_key_or_admin(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> None:
    if await _resolve_identity(x_api_key, authorization, db) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다.")


async def get_current_identity(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Identity:
    identity = await _resolve_identity(x_api_key, authorization, db)
    if identity is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다.")
    return identity


async def get_current_user(
    identity: Identity = Depends(get_current_identity),
) -> User:
    if identity.kind != "user" or identity.user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="사용자 인증이 필요합니다.")
    return identity.user


async def get_current_tenant(
    identity: Identity = Depends(get_current_identity),
) -> Tenant:
    if identity.tenant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="테넌트 정보를 찾을 수 없습니다.")
    return identity.tenant


async def require_tenant_access(
    tenant_id: str,
    identity: Identity = Depends(get_current_identity),
) -> None:
    if identity.kind == "admin":
        return
    if identity.tenant_id is None or identity.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 테넌트에 접근할 수 없습니다.",
        )
