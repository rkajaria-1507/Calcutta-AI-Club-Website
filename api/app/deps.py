from uuid import UUID

import jwt
from fastapi import Header, HTTPException, status

from app.config import settings
from app.security import decode_access_token


async def get_current_member_id(authorization: str | None = Header(default=None)) -> UUID:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        return decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or expired token")


async def get_optional_member_id(authorization: str | None = Header(default=None)) -> UUID | None:
    """Like get_current_member_id, but anonymous callers get None instead of 401."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        return decode_access_token(token)
    except jwt.PyJWTError:
        return None


async def require_admin(x_admin_secret: str | None = Header(default=None)) -> None:
    if not x_admin_secret or x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid admin secret")


async def is_admin(x_admin_secret: str | None = Header(default=None)) -> bool:
    """Non-raising admin check, for endpoints where admin is one of several allowed roles."""
    return bool(x_admin_secret) and x_admin_secret == settings.admin_secret
