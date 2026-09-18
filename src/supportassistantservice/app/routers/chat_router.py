from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.session_repository import SessionRepository
from app.routers.deps import get_current_user_id
from app.schemas.chat import ChatRequest, ChatResponse, HistoryResponse, MessageOut, SessionResponse
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat"])


@router.get("/chat/session", response_model=SessionResponse)
def get_or_create_session(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Resolves the caller's own conversation, independent of any
    client-generated id, so the chat continues across devices/browsers."""
    session = SessionRepository(db).get_or_create_for_user(user_id)
    return SessionResponse(session_id=session.session_id)


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    result = ChatService(db).handle_message(payload.session_id, user_id, payload.message)
    return ChatResponse(session_id=payload.session_id, content=result["content"])


@router.get("/chat/{session_id}/history", response_model=HistoryResponse)
def history(session_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    session = SessionRepository(db).get(session_id)
    if session is None or session.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    messages = ConversationRepository(db).history_for_session(session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[
            MessageOut(sender_role=m.sender_role, content=m.content, created_at=m.created_at.isoformat())
            for m in messages
        ],
    )
