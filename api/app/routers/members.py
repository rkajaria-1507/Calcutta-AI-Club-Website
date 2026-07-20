from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app import anthropic_client
from app.db import get_pool
from app.deps import get_current_member_id
from app.events import log_event
from app.routers.pitches import _row_to_pitch
from app.schemas.members import (
    MemberDetail,
    MemberOnboard,
    MemberOnboardResponse,
    MemberOut,
    MemberUpdate,
)
from app.security import create_access_token

router = APIRouter(tags=["members"])

MEMBER_COLUMNS = """
    id, name, built, taste, contrarian, offer, ask, dream, socials,
    field, build_into, line, epithet, tags, created_at
"""


def _row_to_member(row: asyncpg.Record) -> MemberOut:
    import json

    socials = row["socials"]
    if isinstance(socials, str):
        socials = json.loads(socials)
    return MemberOut(
        id=row["id"],
        name=row["name"],
        built=row["built"],
        taste=row["taste"],
        contrarian=row["contrarian"],
        offer=row["offer"],
        ask=row["ask"],
        dream=row["dream"],
        socials=socials or {},
        field=row["field"],
        build_into=row["build_into"],
        line=row["line"],
        epithet=row["epithet"],
        tags=list(row["tags"] or []),
        created_at=row["created_at"],
    )


def _fallback_card(body: MemberOnboard) -> dict:
    built = body.built or ""
    return {
        "line": f"New on the wall: {(built[:90] or 'story still being written')}.",
        "epithet": "Just walked in",
        "field": "Undeclared",
        "build_into": " ".join(built.split()[:4]) or "Undeclared",
        "tags": [],
    }


async def _generate_card(body: MemberOnboard) -> dict:
    if not anthropic_client.has_key():
        return _fallback_card(body)

    prompt = f"""You are the Calcutta AI Club's directory intelligence. A new member just answered the intake. Read them and write their card.

Name: {body.name}
Building now / dream build: {body.built}
Taste they'd defend: {body.taste}
Contrarian AI belief: {body.contrarian}
Could teach: {body.offer}
Needs right now: {body.ask}
Dream collaboration: {body.dream}

Return ONLY JSON, no markdown fences:
{{
  "line": "one sharp sentence a knowing friend would write to introduce them, present tense, specific, under 22 words",
  "epithet": "a 3-6 word nickname earned from their answers, no quotes",
  "field": "their field in 1-3 words, inferred",
  "build_into": "what they're building toward, 2-5 words",
  "tags": ["#3", "#to", "#five", "#lowercase", "#hashtags"]
}}"""
    try:
        text = await anthropic_client.complete(prompt)
        return anthropic_client.parse_json(text)
    except Exception:
        return _fallback_card(body)


@router.post("/members", response_model=MemberOnboardResponse, status_code=status.HTTP_201_CREATED)
async def onboard_member(body: MemberOnboard, pool: asyncpg.Pool = Depends(get_pool)):
    card = await _generate_card(body)

    async with pool.acquire() as conn:
        async with conn.transaction():
            import json as jsonlib

            row = await conn.fetchrow(
                f"""
                insert into members (name, built, taste, contrarian, offer, ask, dream, socials,
                                      field, build_into, line, epithet, tags)
                values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13)
                returning {MEMBER_COLUMNS}
                """,
                body.name,
                body.built,
                body.taste,
                body.contrarian,
                body.offer,
                body.ask,
                body.dream,
                jsonlib.dumps(body.socials),
                card.get("field"),
                card.get("build_into"),
                card.get("line"),
                card.get("epithet"),
                card.get("tags", []),
            )
            await log_event(
                conn,
                row["id"],
                "member.joined",
                {"answers": body.model_dump(), "generated": card},
            )

    token = create_access_token(row["id"])
    return MemberOnboardResponse(token=token, member=_row_to_member(row))


@router.get("/members", response_model=list[MemberOut])
async def list_members(pool: asyncpg.Pool = Depends(get_pool)):
    rows = await pool.fetch(f"select {MEMBER_COLUMNS} from members order by created_at desc")
    return [_row_to_member(row) for row in rows]


@router.get("/members/{member_id}", response_model=MemberDetail)
async def get_member(member_id: UUID, pool: asyncpg.Pool = Depends(get_pool)):
    member_row = await pool.fetchrow(f"select {MEMBER_COLUMNS} from members where id = $1", member_id)
    if member_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")

    pitch_rows = await pool.fetch(
        """
        select p.id, p.title, p.idea, p.ask, p.suggested, p.created_at,
               m.id as author_id, m.name as author_name,
               (select count(*) from comments c where c.pitch_id = p.id) as comment_count
        from pitches p
        join members m on m.id = p.author_id
        where p.author_id = $1
        order by p.created_at desc
        """,
        member_id,
    )
    return MemberDetail(
        member=_row_to_member(member_row),
        pitches=[_row_to_pitch(row) for row in pitch_rows],
    )


@router.get("/me", response_model=MemberOut)
async def get_me(
    member_id: UUID = Depends(get_current_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    row = await pool.fetchrow(f"select {MEMBER_COLUMNS} from members where id = $1", member_id)
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

    async with pool.acquire() as conn:
        async with conn.transaction():
            if fields:
                import json as jsonlib

                set_clauses = []
                values: list = []
                for i, (key, value) in enumerate(fields.items(), start=1):
                    if key == "socials":
                        set_clauses.append(f"socials = ${i}::jsonb")
                        values.append(jsonlib.dumps(value))
                    else:
                        set_clauses.append(f"{key} = ${i}")
                        values.append(value)
                values.append(member_id)
                await conn.execute(
                    f"update members set {', '.join(set_clauses)} where id = ${len(values)}",
                    *values,
                )
                await log_event(conn, member_id, "member.edited", {"changed": list(fields.keys())})

            row = await conn.fetchrow(f"select {MEMBER_COLUMNS} from members where id = $1", member_id)

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
    return _row_to_member(row)
