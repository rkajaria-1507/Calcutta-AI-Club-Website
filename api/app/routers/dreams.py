import asyncpg
from fastapi import APIRouter, Depends

from app.db import get_pool
from app.schemas import DreamOut

router = APIRouter(tags=["dreams"])


@router.get("/dreams", response_model=list[DreamOut])
async def list_dreams(pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(
        """
        select dream, count(*) as members, array_agg(name) as who
        from members
        where dream is not null and dream <> ''
        group by dream
        order by members desc
        """
    )
    return [DreamOut(dream=row["dream"], members=row["members"], who=list(row["who"])) for row in rows]
