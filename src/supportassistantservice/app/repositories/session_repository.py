from sqlalchemy.orm import Session

from app.models.session import ChatSession


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
        elif user_id is not None and session.user_id != user_id:
            session.user_id = user_id
            self.db.commit()
        return session
