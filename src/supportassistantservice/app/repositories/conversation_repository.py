from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.session import ChatSession


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_open_for_session(self, session_id: str) -> Conversation | None:
        return self.db.scalar(
            select(Conversation)
            .where(Conversation.session_id == session_id, Conversation.status == "open")
            .order_by(Conversation.started_at.desc())
        )

    def get_or_create_open(self, session_id: str) -> Conversation:
        conversation = self.get_open_for_session(session_id)
        if conversation is None:
            conversation = Conversation(session_id=session_id)
            self.db.add(conversation)
            self.db.commit()
            self.db.refresh(conversation)
        return conversation

    def add_message(self, message: Message) -> Message:
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def history(self, conversation_id: str, limit: int = 20) -> list[Message]:
        return list(
            self.db.scalars(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
                .limit(limit)
            )
        )

    def history_for_session(self, session_id: str, limit: int = 50) -> list[Message]:
        return list(
            self.db.scalars(
                select(Message)
                .join(Conversation, Conversation.conversation_id == Message.conversation_id)
                .where(Conversation.session_id == session_id)
                .order_by(Message.created_at.asc())
                .limit(limit)
            )
        )

    def get(self, conversation_id: str) -> Conversation | None:
        return self.db.get(Conversation, conversation_id)

    def list_all(self, limit: int = 50, offset: int = 0) -> list[Conversation]:
        return list(
            self.db.scalars(
                select(Conversation)
                .options(joinedload(Conversation.session))
                .order_by(Conversation.started_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )

    def message_count(self, conversation_id: str) -> int:
        return (
            self.db.scalar(
                select(func.count()).select_from(Message).where(Message.conversation_id == conversation_id)
            )
            or 0
        )

    def last_message(self, conversation_id: str) -> Message | None:
        return self.db.scalar(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Conversation)) or 0

    def count_distinct_users(self) -> int:
        return (
            self.db.scalar(select(func.count(func.distinct(ChatSession.user_id))).where(ChatSession.user_id.is_not(None)))
            or 0
        )
