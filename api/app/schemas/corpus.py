from pydantic import BaseModel, Field


class CorpusAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class CorpusAskResponse(BaseModel):
    answer: str
