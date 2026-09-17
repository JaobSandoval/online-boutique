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
