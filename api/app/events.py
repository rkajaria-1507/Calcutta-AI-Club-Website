import json
from uuid import UUID

import asyncpg


async def log_event(
    conn: asyncpg.Connection,
    member_id: UUID | None,
    event_type: str,
    payload: dict | None = None,
) -> None:
    await conn.execute(
        "insert into events (member_id, type, payload) values ($1, $2, $3::jsonb)",
        member_id,
        event_type,
        json.dumps(payload or {}),
    )
