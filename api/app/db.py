import asyncpg
from fastapi import Request

from app.config import settings

_pool: asyncpg.Pool | None = None


async def connect_db() -> asyncpg.Pool:
    global _pool
    _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=10)
    return _pool


async def disconnect_db() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool
