from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message


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
