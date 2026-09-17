from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.conversation_repository import ConversationRepository
from app.routers.deps import get_optional_user_id
from app.schemas.chat import ChatRequest, ChatResponse, HistoryResponse, MessageOut
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user_id: str | None = Depends(get_optional_user_id), db: Session = Depends(get_db)):
    result = ChatService(db).handle_message(payload.session_id, user_id, payload.message)
    return ChatResponse(session_id=payload.session_id, content=result["content"])


@router.get("/chat/{session_id}/history", response_model=HistoryResponse)
def history(session_id: str, db: Session = Depends(get_db)):
    messages = ConversationRepository(db).history_for_session(session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[
            MessageOut(sender_role=m.sender_role, content=m.content, created_at=m.created_at.isoformat())
            for m in messages
        ],
    )
