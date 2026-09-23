from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.ticket_repository import TicketRepository
from app.routers.deps import require_roles
from app.schemas.admin import (
    AdminStats,
    ConversationListResponse,
    ConversationMessagesResponse,
    ConversationSummary,
    TicketListResponse,
    TicketOut,
    TicketUpdateRequest,
)
from app.schemas.chat import MessageOut

router = APIRouter(prefix="/admin", tags=["admin"])

require_support = require_roles("admin", "support_agent")


def _preview(text: str | None, length: int = 80) -> str | None:
    if text is None:
        return None
    return text if len(text) <= length else text[:length] + "…"


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db), _: str = Depends(require_support)):
    conversations = ConversationRepository(db)
    tickets = TicketRepository(db)
    return AdminStats(
        total_conversations=conversations.count_all(),
        open_tickets=tickets.count_open(),
        distinct_users=conversations.count_distinct_users(),
    )


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: str = Depends(require_support),
):
    repo = ConversationRepository(db)
    summaries = []
    for conv in repo.list_all(limit=limit, offset=offset):
        last = repo.last_message(conv.conversation_id)
        summaries.append(
            ConversationSummary(
                conversation_id=conv.conversation_id,
                session_id=conv.session_id,
                user_id=conv.session.user_id if conv.session else None,
                started_at=conv.started_at.isoformat(),
                status=conv.status,
                message_count=repo.message_count(conv.conversation_id),
                last_message_preview=_preview(last.content if last else None),
            )
        )
    return ConversationListResponse(conversations=summaries, limit=limit, offset=offset)


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationMessagesResponse)
def conversation_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_support),
):
    repo = ConversationRepository(db)
    if repo.get(conversation_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    messages = repo.history(conversation_id, limit=500)
    return ConversationMessagesResponse(
        conversation_id=conversation_id,
        messages=[
            MessageOut(sender_role=m.sender_role, content=m.content, created_at=m.created_at.isoformat())
            for m in messages
        ],
    )


@router.get("/tickets", response_model=TicketListResponse)
def list_tickets(
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: str = Depends(require_support),
):
    tickets = TicketRepository(db).list_all(status=status_filter)
    return TicketListResponse(
        tickets=[
            TicketOut(
                ticket_id=t.ticket_id,
                conversation_id=t.conversation_id,
                category=t.category,
                description=t.description,
                status=t.status,
                created_at=t.created_at.isoformat(),
                resolved_at=t.resolved_at.isoformat() if t.resolved_at else None,
            )
            for t in tickets
        ]
    )


@router.patch("/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: str,
    payload: TicketUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_support),
):
    repo = TicketRepository(db)
    ticket = repo.get(ticket_id)
    if ticket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    ticket = repo.update_status(ticket, payload.status)
    return TicketOut(
        ticket_id=ticket.ticket_id,
        conversation_id=ticket.conversation_id,
        category=ticket.category,
        description=ticket.description,
        status=ticket.status,
        created_at=ticket.created_at.isoformat(),
        resolved_at=ticket.resolved_at.isoformat() if ticket.resolved_at else None,
    )
