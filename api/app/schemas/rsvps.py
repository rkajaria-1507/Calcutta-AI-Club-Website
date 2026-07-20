from uuid import UUID

from pydantic import BaseModel, Field


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
