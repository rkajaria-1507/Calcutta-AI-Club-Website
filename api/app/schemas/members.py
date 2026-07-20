from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.pitches import PitchOut


class MemberOnboard(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    built: str | None = None
    taste: str | None = None
    contrarian: str | None = None
    offer: str | None = None
    ask: str | None = None
    dream: str | None = None
    socials: dict = Field(default_factory=dict)


class MemberOut(BaseModel):
    id: UUID
    name: str
    built: str | None
    taste: str | None
    contrarian: str | None
    offer: str | None
    ask: str | None
    dream: str | None
    socials: dict
    field: str | None
    build_into: str | None
    line: str | None
    epithet: str | None
    tags: list[str]
    created_at: datetime


class MemberOnboardResponse(BaseModel):
    token: str
    member: MemberOut


class MemberUpdate(BaseModel):
    name: str | None = None
    built: str | None = None
    taste: str | None = None
    contrarian: str | None = None
    offer: str | None = None
    ask: str | None = None
    dream: str | None = None
    socials: dict | None = None
    field: str | None = None
    build_into: str | None = None
    line: str | None = None
    epithet: str | None = None
    tags: list[str] | None = None


class MemberDetail(BaseModel):
    member: MemberOut
    pitches: list[PitchOut]
