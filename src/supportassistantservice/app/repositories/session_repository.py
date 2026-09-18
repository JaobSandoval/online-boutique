from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.session import ChatSession


class SessionOwnershipError(Exception):
    """Raised when a request tries to attach to a session that already
    belongs to a different user (e.g. a reused/guessed session_id)."""


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, session_id: str) -> ChatSession | None:
        return self.db.get(ChatSession, session_id)

    def get_or_create(self, session_id: str, user_id: str | None) -> ChatSession:
        session = self.get(session_id)
        if session is None:
            session = ChatSession(session_id=session_id, user_id=user_id)
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            return session
        if session.user_id is not None and user_id is not None and session.user_id != user_id:
            raise SessionOwnershipError(f"session {session_id} belongs to a different user")
        if session.user_id is None and user_id is not None:
            session.user_id = user_id
            self.db.commit()
        return session

    def get_or_create_for_user(self, user_id: str) -> ChatSession:
        """Resolves the session that owns a user's conversation history,
        independent of any client-generated session_id — so logging in from
        a new device/browser still sees the same conversation."""
        session = self.db.scalar(
            select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc())
        )
        if session is None:
            session = ChatSession(user_id=user_id)
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
        return session
