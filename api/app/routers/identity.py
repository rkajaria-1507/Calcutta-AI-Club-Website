from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id
from app.schemas import JoinRequest, JoinResponse, MemberOut, MemberUpdate
from app.security import create_access_token

router = APIRouter(tags=["identity"])


def _row_to_member(row: asyncpg.Record) -> MemberOut:
    return MemberOut(
        id=row["id"],
        name=row["name"],
        avatar_url=row["avatar_url"],
        tagline=row["tagline"],
        building_now=row["building_now"],
    )


@router.post("/join", response_model=JoinResponse, status_code=status.HTTP_201_CREATED)
async def join(body: JoinRequest, pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow(
        """
        insert into members (name, tagline, avatar_url)
        values ($1, $2, $3)
        returning id, name, avatar_url, tagline, building_now
        """,
        body.name,
        body.tagline,
        body.avatar_url,
    )
    token = create_access_token(row["id"])
    return JoinResponse(token=token, member=_row_to_member(row))


@router.get("/me", response_model=MemberOut)
async def get_me(
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    row = await pool.fetchrow(
        "select id, name, avatar_url, tagline, building_now from members where id = $1",
        member_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
    return _row_to_member(row)


@router.patch("/me", response_model=MemberOut)
async def update_me(
    body: MemberUpdate,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        row = await pool.fetchrow(
            "select id, name, avatar_url, tagline, building_now from members where id = $1",
            member_id,
        )
    else:
        set_clauses = []
        values: list = []
        for i, (key, value) in enumerate(fields.items(), start=1):
            set_clauses.append(f"{key} = ${i}")
            values.append(value)
        values.append(member_id)
        query = f"""
            update members set {', '.join(set_clauses)}
            where id = ${len(values)}
            returning id, name, avatar_url, tagline, building_now
        """
        row = await pool.fetchrow(query, *values)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
    return _row_to_member(row)
