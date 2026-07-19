from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_member_id, require_admin
from app.routers.projects import _row_to_project
from app.schemas import (
    LeaderboardEntry,
    MyVoteOut,
    RsvpAvatar,
    RsvpOut,
    RsvpRequest,
    RsvpsGrouped,
    SessionCreate,
    SessionDetail,
    SessionOut,
    SessionUpdate,
    VoteOut,
    VoteRequest,
)

router = APIRouter(tags=["sessions"])


def _row_to_session(row: asyncpg.Record) -> SessionOut:
    return SessionOut(
        id=row["id"],
        title=row["title"],
        topic=row["topic"],
        venue=row["venue"],
        starts_at=row["starts_at"],
        voting_open=row["voting_open"],
    )


async def _get_session_or_404(pool: asyncpg.Pool, session_id: UUID) -> asyncpg.Record:
    row = await pool.fetchrow("select * from sessions where id = $1", session_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return row


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
        returning id, title, topic, venue, starts_at, voting_open
        """,
        body.title,
        body.topic,
        body.venue,
        body.starts_at,
    )
    return _row_to_session(row)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(
        "select id, title, topic, venue, starts_at, voting_open from sessions order by starts_at asc"
    )
    return [_row_to_session(row) for row in rows]


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    session_row = await _get_session_or_404(pool, session_id)

    rsvp_rows = await pool.fetch(
        "select status, count(*) as count from rsvps where session_id = $1 group by status",
        session_id,
    )
    rsvp_counts = {"going": 0, "maybe": 0, "no": 0}
    for r in rsvp_rows:
        rsvp_counts[r["status"]] = r["count"]

    project_rows = await pool.fetch(
        """
        select p.id, p.title, p.tagline, p.link, p.repo_url, p.image_url, p.session_id, p.created_at,
               m.id as owner_id, m.name as owner_name, m.avatar_url as owner_avatar
        from projects p
        join members m on m.id = p.owner_id
        where p.session_id = $1
        order by p.created_at desc
        """,
        session_id,
    )

    return SessionDetail(
        session=_row_to_session(session_row),
        rsvp_counts=rsvp_counts,
        projects=[_row_to_project(row) for row in project_rows],
    )


@router.patch(
    "/sessions/{session_id}",
    response_model=SessionOut,
    dependencies=[Depends(require_admin)],
)
async def update_session(session_id: UUID, body: SessionUpdate, pool: asyncpg.Pool = Depends(get_pool)):
    await _get_session_or_404(pool, session_id)
    fields = body.model_dump(exclude_unset=True)
    if fields:
        set_clauses = []
        values: list = []
        for i, (key, value) in enumerate(fields.items(), start=1):
            set_clauses.append(f"{key} = ${i}")
            values.append(value)
        values.append(session_id)
        await pool.execute(
            f"update sessions set {', '.join(set_clauses)} where id = ${len(values)}",
            *values,
        )
    row = await pool.fetchrow(
        "select id, title, topic, venue, starts_at, voting_open from sessions where id = $1",
        session_id,
    )
    return _row_to_session(row)


@router.get("/sessions/{session_id}/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(
        """
        select p.id, p.title, p.image_url,
               m.name as owner_name, m.avatar_url as owner_avatar,
               coalesce(sum(v.score), 0) as score,
               count(v.id) as vote_count
        from projects p
        join members m       on m.id = p.owner_id
        left join votes v    on v.project_id = p.id
        where p.session_id = $1
        group by p.id, m.name, m.avatar_url
        order by score desc, vote_count desc, p.created_at asc
        """,
        session_id,
    )
    return [
        LeaderboardEntry(
            project_id=row["id"],
            title=row["title"],
            owner_name=row["owner_name"],
            owner_avatar=row["owner_avatar"],
            image_url=row["image_url"],
            score=row["score"],
            vote_count=row["vote_count"],
            rank=i + 1,
        )
        for i, row in enumerate(rows)
    ]


@router.put("/sessions/{session_id}/rsvp", response_model=RsvpOut)
async def upsert_rsvp(
    session_id: UUID,
    body: RsvpRequest,
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    await _get_session_or_404(pool, session_id)
    row = await pool.fetchrow(
        """
        insert into rsvps (member_id, session_id, status)
        values ($1, $2, $3)
        on conflict (member_id, session_id) do update set status = excluded.status
        returning member_id, session_id, status
        """,
        member_id,
        session_id,
        body.status,
    )
    return RsvpOut(session_id=row["session_id"], member_id=row["member_id"], status=row["status"])


@router.get("/sessions/{session_id}/rsvps", response_model=RsvpsGrouped)
async def list_rsvps(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    await _get_session_or_404(pool, session_id)
    rows = await pool.fetch(
        """
        select r.status, m.id, m.name, m.avatar_url
        from rsvps r
        join members m on m.id = r.member_id
        where r.session_id = $1
        order by r.created_at asc
        """,
        session_id,
    )
    grouped: dict[str, list[RsvpAvatar]] = {"going": [], "maybe": [], "no": []}
    for row in rows:
        grouped[row["status"]].append(
            RsvpAvatar(id=row["id"], name=row["name"], avatar_url=row["avatar_url"])
        )
    return RsvpsGrouped(**grouped)


@router.post("/sessions/{session_id}/vote", response_model=VoteOut, status_code=status.HTTP_201_CREATED)
async def cast_vote(
    session_id: UUID,
    body: VoteRequest,
    voter_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    session_row = await _get_session_or_404(pool, session_id)
    if not session_row["voting_open"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="voting is closed for this session")

    project_row = await pool.fetchrow(
        "select owner_id from projects where id = $1 and session_id = $2",
        body.project_id,
        session_id,
    )
    if project_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not in this session")
    if project_row["owner_id"] == voter_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="cannot vote for your own project")

    try:
        row = await pool.fetchrow(
            """
            insert into votes (voter_id, project_id, session_id, score)
            values ($1, $2, $3, $4)
            returning id, project_id, score
            """,
            voter_id,
            body.project_id,
            session_id,
            body.score,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already voted for this project")

    return VoteOut(id=row["id"], project_id=row["project_id"], score=row["score"])


@router.get("/sessions/{session_id}/my-votes", response_model=list[MyVoteOut])
async def my_votes(
    session_id: UUID,
    voter_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    rows = await pool.fetch(
        "select project_id, score from votes where session_id = $1 and voter_id = $2",
        session_id,
        voter_id,
    )
    return [MyVoteOut(project_id=row["project_id"], score=row["score"]) for row in rows]
