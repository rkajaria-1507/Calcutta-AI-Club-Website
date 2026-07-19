from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id, get_optional_member_id, is_admin
from app.schemas import OwnerSummary, SessionPostCreate, SessionPostOut

router = APIRouter(tags=["session-posts"])


def _row_to_post(row: asyncpg.Record) -> SessionPostOut:
    return SessionPostOut(
        id=row["id"],
        session_id=row["session_id"],
        body=row["body"],
        author=OwnerSummary(
            id=row["author_id"], name=row["author_name"], avatar_url=row["author_avatar"]
        ),
        created_at=row["created_at"],
    )


async def _ensure_session_exists(pool: asyncpg.Pool, session_id: UUID) -> None:
    exists = await pool.fetchval("select 1 from sessions where id = $1", session_id)
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")


@router.post(
    "/sessions/{session_id}/posts",
    response_model=SessionPostOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    session_id: UUID,
    body: SessionPostCreate,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await _ensure_session_exists(pool, session_id)
    row = await pool.fetchrow(
        """
        with inserted as (
            insert into session_posts (session_id, member_id, body)
            values ($1, $2, $3)
            returning id, session_id, member_id, body, created_at
        )
        select i.id, i.session_id, i.body, i.created_at,
               m.id as author_id, m.name as author_name, m.avatar_url as author_avatar
        from inserted i
        join members m on m.id = i.member_id
        """,
        session_id,
        member_id,
        body.body,
    )
    return _row_to_post(row)


@router.get("/sessions/{session_id}/posts", response_model=list[SessionPostOut])
async def list_posts(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    await _ensure_session_exists(pool, session_id)
    rows = await pool.fetch(
        """
        select p.id, p.session_id, p.body, p.created_at,
               m.id as author_id, m.name as author_name, m.avatar_url as author_avatar
        from session_posts p
        join members m on m.id = p.member_id
        where p.session_id = $1
        order by p.created_at desc
        """,
        session_id,
    )
    return [_row_to_post(row) for row in rows]


@router.delete("/sessions/{session_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    session_id: UUID,
    post_id: UUID,
    member_id: UUID | None = Depends(get_optional_member_id),
    admin: bool = Depends(is_admin),
    pool: asyncpg.Pool = Depends(get_pool),
):
    row = await pool.fetchrow(
        "select member_id from session_posts where id = $1 and session_id = $2",
        post_id,
        session_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
    if not admin:
        if member_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
        if row["member_id"] != member_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not the author of this post")
    await pool.execute("delete from session_posts where id = $1", post_id)
    return None
