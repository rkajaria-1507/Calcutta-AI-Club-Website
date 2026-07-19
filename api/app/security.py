from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.config import settings

ALGORITHM = "HS256"
TOKEN_TTL_DAYS = 30


def create_access_token(member_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(member_id),
        "iat": now,
        "exp": now + timedelta(days=TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> UUID:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    return UUID(payload["sub"])
