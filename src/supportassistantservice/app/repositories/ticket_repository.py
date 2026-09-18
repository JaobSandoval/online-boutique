from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.support_ticket import SupportTicket


class TicketRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, conversation_id: str, category: str, description: str) -> SupportTicket:
        ticket = SupportTicket(conversation_id=conversation_id, category=category, description=description)
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    def list_all(self, status: str | None = None, limit: int = 50, offset: int = 0) -> list[SupportTicket]:
        stmt = select(SupportTicket).order_by(SupportTicket.created_at.desc())
        if status is not None:
            stmt = stmt.where(SupportTicket.status == status)
        return list(self.db.scalars(stmt.limit(limit).offset(offset)))

    def get(self, ticket_id: str) -> SupportTicket | None:
        return self.db.get(SupportTicket, ticket_id)

    def update_status(self, ticket: SupportTicket, status: str) -> SupportTicket:
        ticket.status = status
        ticket.resolved_at = datetime.now(timezone.utc) if status == "resolved" else None
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    def count_open(self) -> int:
        return self.db.scalar(select(func.count()).select_from(SupportTicket).where(SupportTicket.status == "open")) or 0
