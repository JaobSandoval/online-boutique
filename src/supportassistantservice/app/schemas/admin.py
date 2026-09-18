from typing import Literal

from pydantic import BaseModel

from app.schemas.chat import MessageOut


class ConversationSummary(BaseModel):
    conversation_id: str
    session_id: str
    user_id: str | None
    started_at: str
    status: str
    message_count: int
    last_message_preview: str | None


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    limit: int
    offset: int


class TicketOut(BaseModel):
    ticket_id: str
    conversation_id: str
    category: str
    description: str
    status: str
    created_at: str
    resolved_at: str | None


class TicketListResponse(BaseModel):
    tickets: list[TicketOut]


class TicketUpdateRequest(BaseModel):
    status: Literal["open", "in_progress", "resolved"]


class ConversationMessagesResponse(BaseModel):
    conversation_id: str
    messages: list[MessageOut]


class AdminStats(BaseModel):
    total_conversations: int
    open_tickets: int
    distinct_users: int
