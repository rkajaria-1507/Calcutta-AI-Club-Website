from pydantic import BaseModel


class DreamOut(BaseModel):
    dream: str
    members: int
    who: list[str]
