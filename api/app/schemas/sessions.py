from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    topic: str | None = None
    venue: str | None = None
    starts_at: datetime


class SessionOut(BaseModel):
    id: UUID
    title: str
    topic: str | None
    venue: str | None
    starts_at: datetime


class CheckinOut(BaseModel):
    session_id: UUID
    member_id: UUID
    created_at: datetime


class CheckinEntry(BaseModel):
    name: str
    epithet: str | None
    ask: str | None
    created_at: datetime
