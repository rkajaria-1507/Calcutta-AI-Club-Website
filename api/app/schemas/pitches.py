from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import AuthorSummary


class PitchOut(BaseModel):
    id: UUID
    author: AuthorSummary
    title: str
    idea: str
    ask: str | None
    suggested: list[dict]
    comment_count: int
    created_at: datetime


class PitchCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    idea: str = Field(min_length=1, max_length=1000)
    ask: str | None = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=500)


class CommentOut(BaseModel):
    id: UUID
    author: AuthorSummary
    body: str
    created_at: datetime
