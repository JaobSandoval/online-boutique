from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1)
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    session_id: str
    content: str


class MessageOut(BaseModel):
    sender_role: str
    content: str
    created_at: str


class HistoryResponse(BaseModel):
    session_id: str
    messages: list[MessageOut]
