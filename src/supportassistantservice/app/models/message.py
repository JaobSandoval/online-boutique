import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.conversation_id"), nullable=False, index=True
    )
    sender_role: Mapped[str] = mapped_column(String(10), nullable=False)  # user, bot
    content: Mapped[str] = mapped_column(Text, nullable=False)
    intent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("intents.intent_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")
    intent = relationship("Intent")
    product_query_log = relationship(
        "ProductQueryLog", back_populates="message", uselist=False, cascade="all, delete-orphan"
    )
