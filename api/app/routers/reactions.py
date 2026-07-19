from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id, get_optional_member_id
from app.schemas import ReactionRequest, SessionReactionsOut

router = APIRouter(tags=["reactions"])


@router.post("/projects/{project_id}/react", status_code=status.HTTP_201_CREATED)
async def add_reaction(
    project_id: UUID,
    body: ReactionRequest,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    project_exists = await pool.fetchval("select 1 from projects where id = $1", project_id)
    if project_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    try:
        await pool.execute(
            "insert into reactions (member_id, project_id, emoji) values ($1, $2, $3)",
            member_id,
            project_id,
            body.emoji,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already reacted with this emoji")
    return {"project_id": project_id, "emoji": body.emoji}


@router.delete("/projects/{project_id}/react", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    project_id: UUID,
    body: ReactionRequest,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await pool.execute(
        "delete from reactions where member_id = $1 and project_id = $2 and emoji = $3",
        member_id,
        project_id,
        body.emoji,
    )
    return None


# ---------- Session reactions ("hype" on the invite page) ----------


async def _ensure_session_exists(pool: asyncpg.Pool, session_id: UUID) -> None:
    exists = await pool.fetchval("select 1 from sessions where id = $1", session_id)
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")


@router.post("/sessions/{session_id}/react", status_code=status.HTTP_201_CREATED)
async def add_session_reaction(
    session_id: UUID,
    body: ReactionRequest,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await _ensure_session_exists(pool, session_id)
    try:
        await pool.execute(
            "insert into session_reactions (member_id, session_id, emoji) values ($1, $2, $3)",
            member_id,
            session_id,
            body.emoji,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already reacted with this emoji")
    return {"session_id": session_id, "emoji": body.emoji}


@router.delete("/sessions/{session_id}/react", status_code=status.HTTP_204_NO_CONTENT)
async def remove_session_reaction(
    session_id: UUID,
    body: ReactionRequest,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await pool.execute(
        "delete from session_reactions where member_id = $1 and session_id = $2 and emoji = $3",
        member_id,
        session_id,
        body.emoji,
    )
    return None


@router.get("/sessions/{session_id}/reactions", response_model=SessionReactionsOut)
async def list_session_reactions(
    session_id: UUID,
    member_id: UUID | None = Depends(get_optional_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await _ensure_session_exists(pool, session_id)
    rows = await pool.fetch(
        "select emoji, count(*) as count from session_reactions where session_id = $1 group by emoji",
        session_id,
    )
    counts = {r["emoji"]: r["count"] for r in rows}
    mine: list[str] = []
    if member_id is not None:
        mine_rows = await pool.fetch(
            "select emoji from session_reactions where session_id = $1 and member_id = $2",
            session_id,
            member_id,
        )
        mine = [r["emoji"] for r in mine_rows]
    return SessionReactionsOut(counts=counts, mine=mine)
