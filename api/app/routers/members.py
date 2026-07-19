from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.routers.identity import _row_to_member
from app.routers.projects import _row_to_project
from app.schemas import MemberDetail, MemberOut

router = APIRouter(tags=["members"])


@router.get("/members", response_model=list[MemberOut])
async def list_members(pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(
        """
        select id, name, avatar_url, tagline, building_now
        from members
        order by created_at desc
        """
    )
    return [_row_to_member(row) for row in rows]


@router.get("/members/{member_id}", response_model=MemberDetail)
async def get_member(member_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    member_row = await pool.fetchrow(
        "select id, name, avatar_url, tagline, building_now from members where id = $1",
        member_id,
    )
    if member_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")

    project_rows = await pool.fetch(
        """
        select p.id, p.title, p.tagline, p.link, p.repo_url, p.image_url, p.session_id, p.created_at,
               m.id as owner_id, m.name as owner_name, m.avatar_url as owner_avatar
        from projects p
        join members m on m.id = p.owner_id
        where p.owner_id = $1
        order by p.created_at desc
        """,
        member_id,
    )
    return MemberDetail(
        member=_row_to_member(member_row),
        projects=[_row_to_project(row) for row in project_rows],
    )
