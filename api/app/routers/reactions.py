from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id
from app.schemas import ReactionRequest

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
