from datetime import datetime, timedelta, timezone
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id, require_admin
from app.events import log_event
from app.schemas.rsvps import RsvpMember, RsvpOut, RsvpRequest, RsvpsGrouped
from app.schemas.sessions import CheckinEntry, CheckinOut, SessionCreate, SessionOut

router = APIRouter(tags=["sessions"])

# How long after a session starts that RSVP/check-in stays open — covers sessions
# running long, without letting people RSVP/check in to something from last month.
SESSION_GRACE = timedelta(hours=6)


async def _get_active_session_or_404(pool: asyncpg.Pool, session_id: UUID) -> None:
    starts_at = await pool.fetchval("select starts_at from sessions where id = $1", session_id)
    if starts_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    if datetime.now(timezone.utc) > starts_at + SESSION_GRACE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session has already ended")


def _row_to_session(row: asyncpg.Record) -> SessionOut:
    return SessionOut(id=row["id"], title=row["title"], topic=row["topic"], venue=row["venue"], starts_at=row["starts_at"])


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch("select id, title, topic, venue, starts_at from sessions order by starts_at asc")
    return [_row_to_session(row) for row in rows]


@router.post(
    "/sessions",
    response_model=SessionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_session(body: SessionCreate, pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow(
        """
        insert into sessions (title, topic, venue, starts_at)
        values ($1, $2, $3, $4)
        returning id, title, topic, venue, starts_at
        """,
        body.title,
        body.topic,
        body.venue,
        body.starts_at,
    )
    return _row_to_session(row)


@router.post("/sessions/{session_id}/checkin", response_model=CheckinOut, status_code=status.HTTP_201_CREATED)
async def checkin(
    session_id: UUID,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await _get_active_session_or_404(pool, session_id)

    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                row = await conn.fetchrow(
                    """
                    insert into checkins (session_id, member_id)
                    values ($1, $2)
                    returning session_id, member_id, created_at
                    """,
                    session_id,
                    member_id,
                )
            except asyncpg.UniqueViolationError:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already checked in")
            await log_event(conn, member_id, "checkin", {"session_id": str(session_id)})

    return CheckinOut(session_id=row["session_id"], member_id=row["member_id"], created_at=row["created_at"])


@router.get("/sessions/{session_id}/checkins", response_model=list[CheckinEntry])
async def list_checkins(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(
        """
        select c.created_at, m.name, m.epithet, m.ask
        from checkins c
        join members m on m.id = c.member_id
        where c.session_id = $1
        order by c.created_at desc
        """,
        session_id,
    )
    return [
        CheckinEntry(name=row["name"], epithet=row["epithet"], ask=row["ask"], created_at=row["created_at"])
        for row in rows
    ]


async def _get_session_or_404(pool: asyncpg.Pool, session_id: UUID) -> None:
    exists = await pool.fetchval("select 1 from sessions where id = $1", session_id)
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")


@router.put("/sessions/{session_id}/rsvp", response_model=RsvpOut)
async def upsert_rsvp(
    session_id: UUID,
    body: RsvpRequest,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await _get_active_session_or_404(pool, session_id)

    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                insert into rsvps (session_id, member_id, status)
                values ($1, $2, $3)
                on conflict (session_id, member_id) do update set status = excluded.status
                returning session_id, member_id, status
                """,
                session_id,
                member_id,
                body.status,
            )
            await log_event(conn, member_id, "rsvp", {"session_id": str(session_id), "status": body.status})

    return RsvpOut(session_id=row["session_id"], member_id=row["member_id"], status=row["status"])


@router.get("/sessions/{session_id}/rsvps", response_model=RsvpsGrouped)
async def list_rsvps(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    await _get_session_or_404(pool, session_id)

    rows = await pool.fetch(
        """
        select r.status, m.id, m.name, m.epithet
        from rsvps r
        join members m on m.id = r.member_id
        where r.session_id = $1
        order by r.created_at asc
        """,
        session_id,
    )
    grouped = {"going": [], "maybe": [], "no": []}
    for row in rows:
        bucket = grouped.get(row["status"])
        if bucket is not None:
            bucket.append(RsvpMember(id=row["id"], name=row["name"], epithet=row["epithet"]))
    return RsvpsGrouped(**grouped)
