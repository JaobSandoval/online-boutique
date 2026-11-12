from sqlalchemy.orm import Session

from app.repositories.intent_repository import IntentRepository

OFF_TOPIC_INTENT = "off_topic"

TOOL_TO_INTENT = {
    "search_products": "search_product",
    "get_recommendations": "recommendation",
    "get_cart": "cart_status",
    "search_faq": "faq",
    "create_ticket": "create_ticket",
}


class IntentService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = IntentRepository(db)

    def resolve_intent_id(self, tool_name: str | None) -> int | None:
        intent_name = TOOL_TO_INTENT.get(tool_name, "other") if tool_name is not None else "other"
        return self.resolve_intent_id_by_name(intent_name)

    def resolve_intent_id_by_name(self, intent_name: str) -> int | None:
        intent = self.repository.get_by_name(intent_name)
        return intent.intent_id if intent else None
