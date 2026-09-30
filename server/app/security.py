"""
Password hashing and login tokens.

Passwords: bcrypt adds a random salt to each password and is deliberately
slow, so a leaked database can't be cracked quickly (unlike plain SHA-256,
which the old Streamlit version used).

Tokens: after login the server hands back a JWT, a signed string that says
"this is user 42, valid until <time>". The browser sends it on every request
in the `Authorization: Bearer <token>` header. The server can check the
signature without a database lookup, and nobody can edit the token without
the secret.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Return the user id inside a valid token, or None if it's invalid or expired."""
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
