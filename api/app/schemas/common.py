from uuid import UUID

from pydantic import BaseModel


class AuthorSummary(BaseModel):
    id: UUID
    name: str
