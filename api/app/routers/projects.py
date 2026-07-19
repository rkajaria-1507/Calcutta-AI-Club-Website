from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id
from app.schemas import OwnerSummary, ProjectCreate, ProjectDetail, ProjectOut, ProjectUpdate

router = APIRouter(tags=["projects"])


def _row_to_project(row: asyncpg.Record) -> ProjectOut:
    return ProjectOut(
        id=row["id"],
        title=row["title"],
        tagline=row["tagline"],
        link=row["link"],
        repo_url=row["repo_url"],
        image_url=row["image_url"],
        session_id=row["session_id"],
        owner=OwnerSummary(id=row["owner_id"], name=row["owner_name"], avatar_url=row["owner_avatar"]),
        created_at=row["created_at"],
    )


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    row = await pool.fetchrow(
        """
        with inserted as (
            insert into projects (owner_id, title, tagline, link, repo_url, image_url, session_id)
            values ($1, $2, $3, $4, $5, $6, $7)
            returning id, title, tagline, link, repo_url, image_url, session_id, created_at, owner_id
        )
        select i.*, m.name as owner_name, m.avatar_url as owner_avatar
        from inserted i
        join members m on m.id = i.owner_id
        """,
        member_id,
        body.title,
        body.tagline,
        body.link,
        body.repo_url,
        body.image_url,
        body.session_id,
    )
    return _row_to_project(row)


@router.get("/projects", response_model=list[ProjectOut])
async def list_projects(pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(
        """
        select p.id, p.title, p.tagline, p.link, p.repo_url, p.image_url, p.session_id, p.created_at,
               m.id as owner_id, m.name as owner_name, m.avatar_url as owner_avatar
        from projects p
        join members m on m.id = p.owner_id
        order by p.created_at desc
        """
    )
    return [_row_to_project(row) for row in rows]


@router.get("/projects/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow(
        """
        select p.id, p.title, p.tagline, p.link, p.repo_url, p.image_url, p.session_id, p.created_at,
               m.id as owner_id, m.name as owner_name, m.avatar_url as owner_avatar
        from projects p
        join members m on m.id = p.owner_id
        where p.id = $1
        """,
        project_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")

    reaction_rows = await pool.fetch(
        "select emoji, count(*) as count from reactions where project_id = $1 group by emoji",
        project_id,
    )
    reaction_counts = {r["emoji"]: r["count"] for r in reaction_rows}

    return ProjectDetail(
        id=row["id"],
        title=row["title"],
        tagline=row["tagline"],
        link=row["link"],
        repo_url=row["repo_url"],
        image_url=row["image_url"],
        session_id=row["session_id"],
        owner=OwnerSummary(id=row["owner_id"], name=row["owner_name"], avatar_url=row["owner_avatar"]),
        created_at=row["created_at"],
        reaction_counts=reaction_counts,
    )


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    owner_row = await pool.fetchrow("select owner_id from projects where id = $1", project_id)
    if owner_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if owner_row["owner_id"] != member_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not the project owner")

    fields = body.model_dump(exclude_unset=True)
    if fields:
        set_clauses = []
        values: list = []
        for i, (key, value) in enumerate(fields.items(), start=1):
            set_clauses.append(f"{key} = ${i}")
            values.append(value)
        values.append(project_id)
        await pool.execute(
            f"update projects set {', '.join(set_clauses)} where id = ${len(values)}",
            *values,
        )

    row = await pool.fetchrow(
        """
        select p.id, p.title, p.tagline, p.link, p.repo_url, p.image_url, p.session_id, p.created_at,
               m.id as owner_id, m.name as owner_name, m.avatar_url as owner_avatar
        from projects p
        join members m on m.id = p.owner_id
        where p.id = $1
        """,
        project_id,
    )
    return _row_to_project(row)
