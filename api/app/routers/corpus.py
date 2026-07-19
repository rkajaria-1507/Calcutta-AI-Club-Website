import re

import asyncpg
from fastapi import APIRouter, Depends

from app import anthropic_client
from app.db import get_pool
from app.deps import get_optional_member_id
from app.events import log_event
from app.schemas import CorpusAskRequest, CorpusAskResponse

router = APIRouter(tags=["corpus"])


def _fallback_answer(question: str, members: list[asyncpg.Record]) -> str:
    q = question.lower()
    hits = []
    for m in members:
        haystack = " ".join(
            filter(None, [m["field"], m["built"], m["build_into"], m["taste"], m["offer"], *(m["tags"] or [])])
        ).lower()
        words = [w for w in re.split(r"[^a-z#]+", haystack) if len(w) > 3]
        if any(w in q for w in words):
            hits.append(m)
    if not hits:
        return "Nobody on the wall matches that yet. Try a broader phrasing, or a tag."
    names = ", ".join(m["name"] for m in hits[:3])
    return f"Looks like {names} — {hits[0]['line'] or ''}"


@router.post("/corpus/ask", response_model=CorpusAskResponse)
async def ask_corpus(
    body: CorpusAskRequest,
    member_id=Depends(get_optional_member_id),
    pool: asyncpg.Pool = Depends(get_pool),
):
    members = await pool.fetch(
        "select name, field, built, build_into, taste, offer, tags, line from members"
    )

    if not anthropic_client.has_key():
        answer = _fallback_answer(body.question, members)
    else:
        directory = [
            {
                "name": m["name"],
                "field": m["field"],
                "built": m["built"],
                "building": m["build_into"],
                "taste": m["taste"],
                "offers": m["offer"],
                "tags": m["tags"],
            }
            for m in members
        ]
        prompt = (
            "You are the Calcutta AI Club directory, answering questions about who's in the "
            f"room. Here is the full member corpus:\n\n{directory}\n\n"
            f'Question: "{body.question}"\n\n'
            "Answer conversationally and briefly, naming specific members and why they fit. "
            "If nobody fits, say so plainly. Never invent members not in the corpus. Write "
            "like a knowing host making introductions, not a search engine. Max 4 sentences."
        )
        try:
            answer = await anthropic_client.complete(prompt)
        except Exception:
            answer = _fallback_answer(body.question, members)

    async with pool.acquire() as conn:
        await log_event(conn, member_id, "corpus.asked", {"question": body.question})

    return CorpusAskResponse(answer=answer)
