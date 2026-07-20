import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

JWT_ALGORITHM = "HS256"
JWT_SUBJECT = "admin"


def verify_admin_credentials(username: str, password: str) -> bool:
    return secrets.compare_digest(
        username.encode("utf-8"), settings.admin_username.encode("utf-8")
    ) and secrets.compare_digest(password.encode("utf-8"), settings.admin_password.encode("utf-8"))


def create_access_token() -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.admin_jwt_expire_minutes)
    payload = {"sub": JWT_SUBJECT, "exp": expires_at}
    return jwt.encode(payload, settings.admin_jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> bool:
    payload = jwt.decode(token, settings.admin_jwt_secret, algorithms=[JWT_ALGORITHM])
    return payload.get("sub") == JWT_SUBJECT


def create_user_access_token(user_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    payload = {"sub": user_id, "exp": expires_at, "kind": "user"}
    return jwt.encode(payload, settings.admin_jwt_secret, algorithm=JWT_ALGORITHM)


def decode_user_id_from_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.admin_jwt_secret, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def generate_otp_code() -> str:
    return str(secrets.randbelow(900000) + 100000)


def generate_user_api_key() -> str:
    return f"sk-{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def hash_otp_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    return f"sk-{secrets.token_hex(16)}"


def mask_api_key(key: str) -> str:
    return f"{key[:7]}...{key[-4:]}"
