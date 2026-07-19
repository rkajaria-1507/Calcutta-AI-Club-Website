from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------- Members ----------

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


class AuthorSummary(BaseModel):
    id: UUID
    name: str


class PitchOut(BaseModel):
    id: UUID
    author: AuthorSummary
    title: str
    idea: str
    ask: str | None
    suggested: list[dict]
    comment_count: int
    created_at: datetime


class MemberDetail(BaseModel):
    member: MemberOut
    pitches: list[PitchOut]


# ---------- Corpus ----------

class CorpusAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class CorpusAskResponse(BaseModel):
    answer: str


# ---------- Pitches ----------

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


# ---------- Dreams ----------

class DreamOut(BaseModel):
    dream: str
    members: int
    who: list[str]


# ---------- Sessions ----------

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


# ---------- RSVPs ----------

class RsvpRequest(BaseModel):
    status: str = Field(pattern="^(going|maybe|no)$")


class RsvpOut(BaseModel):
    session_id: UUID
    member_id: UUID
    status: str


class RsvpMember(BaseModel):
    id: UUID
    name: str
    epithet: str | None


class RsvpsGrouped(BaseModel):
    going: list[RsvpMember]
    maybe: list[RsvpMember]
    no: list[RsvpMember]
