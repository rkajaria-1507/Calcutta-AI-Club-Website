from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------- Identity ----------

class JoinRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    tagline: str | None = None
    avatar_url: str | None = None


class MemberOut(BaseModel):
    id: UUID
    name: str
    avatar_url: str | None
    tagline: str | None
    building_now: str | None


class JoinResponse(BaseModel):
    token: str
    member: MemberOut


class MemberUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    avatar_url: str | None = None
    building_now: str | None = None


class MemberDetail(BaseModel):
    member: MemberOut
    projects: list["ProjectOut"]


# ---------- Projects ----------

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    tagline: str | None = None
    link: str | None = None
    repo_url: str | None = None
    image_url: str | None = None
    session_id: UUID | None = None


class ProjectUpdate(BaseModel):
    title: str | None = None
    tagline: str | None = None
    link: str | None = None
    repo_url: str | None = None
    image_url: str | None = None
    session_id: UUID | None = None


class OwnerSummary(BaseModel):
    id: UUID
    name: str
    avatar_url: str | None


class ProjectOut(BaseModel):
    id: UUID
    title: str
    tagline: str | None
    link: str | None
    repo_url: str | None
    image_url: str | None
    session_id: UUID | None
    owner: OwnerSummary
    created_at: datetime


class ProjectDetail(BaseModel):
    id: UUID
    title: str
    tagline: str | None
    link: str | None
    repo_url: str | None
    image_url: str | None
    session_id: UUID | None
    owner: OwnerSummary
    created_at: datetime
    reaction_counts: dict[str, int]


# ---------- Sessions ----------

class SessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    topic: str | None = None
    venue: str | None = None
    starts_at: datetime
    cover_image_url: str | None = None
    host_blurb: str | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    topic: str | None = None
    venue: str | None = None
    starts_at: datetime | None = None
    voting_open: bool | None = None
    cover_image_url: str | None = None
    host_blurb: str | None = None


class SessionOut(BaseModel):
    id: UUID
    title: str
    topic: str | None
    venue: str | None
    starts_at: datetime
    voting_open: bool
    cover_image_url: str | None
    host_blurb: str | None


class SessionDetail(BaseModel):
    session: SessionOut
    rsvp_counts: dict[str, int]
    projects: list[ProjectOut]


class LeaderboardEntry(BaseModel):
    project_id: UUID
    title: str
    owner_name: str
    owner_avatar: str | None
    image_url: str | None
    score: int
    vote_count: int
    rank: int


# ---------- RSVP ----------

class RsvpRequest(BaseModel):
    status: str = Field(pattern="^(going|maybe|no)$")
    plus_ones: int = Field(default=0, ge=0, le=3)


class RsvpOut(BaseModel):
    session_id: UUID
    member_id: UUID
    status: str
    plus_ones: int


class RsvpAvatar(BaseModel):
    id: UUID
    name: str
    avatar_url: str | None
    plus_ones: int = 0


class RsvpsGrouped(BaseModel):
    going: list[RsvpAvatar]
    maybe: list[RsvpAvatar]
    no: list[RsvpAvatar]


# ---------- Votes ----------

class VoteRequest(BaseModel):
    project_id: UUID
    score: int = Field(default=1, ge=1, le=5)


class VoteOut(BaseModel):
    id: UUID
    project_id: UUID
    score: int


class MyVoteOut(BaseModel):
    project_id: UUID
    score: int


# ---------- Reactions ----------

class ReactionRequest(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class SessionReactionsOut(BaseModel):
    counts: dict[str, int]
    mine: list[str]


# ---------- Session posts (hype wall) ----------

class SessionPostCreate(BaseModel):
    body: str = Field(min_length=1, max_length=280)


class SessionPostOut(BaseModel):
    id: UUID
    session_id: UUID
    body: str
    author: OwnerSummary
    created_at: datetime
