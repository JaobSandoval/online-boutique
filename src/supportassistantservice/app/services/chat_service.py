import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.clients.cart_client import CartClient
from app.clients.recommendation_client import RecommendationClient
from app.core.openai_client import OpenAIClient
from app.models.message import Message
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.faq_repository import FaqRepository
from app.repositories.product_query_repository import ProductQueryRepository
from app.repositories.session_repository import SessionOwnershipError, SessionRepository
from app.repositories.ticket_repository import TicketRepository
from app.services.catalog_service import CatalogService
from app.services.intent_service import OFF_TOPIC_INTENT, IntentService
from app.services.scope_guard import ScopeGuard, sanitize_reply

MAX_TOOL_ITERATIONS = 4

# Compartido entre requests para aprovechar la caché del catálogo.
_default_catalog = CatalogService()


class ChatService:
    def __init__(
        self,
        db: Session,
        openai_client: OpenAIClient | None = None,
        catalog: CatalogService | None = None,
        recommendation_client: RecommendationClient | None = None,
        cart_client: CartClient | None = None,
    ):
        self.db = db
        self.sessions = SessionRepository(db)
        self.conversations = ConversationRepository(db)
        self.intents = IntentService(db)
        self.product_queries = ProductQueryRepository(db)
        self.faqs = FaqRepository(db)
        self.tickets = TicketRepository(db)

        self.catalog = catalog or _default_catalog
        self.recommendation_client = recommendation_client or RecommendationClient()
        self.cart_client = cart_client or CartClient()
        self.openai = openai_client or OpenAIClient()
        self.scope_guard = ScopeGuard()

    def handle_message(self, session_id: str, user_id: str | None, text: str) -> dict:
        try:
            session = self.sessions.get_or_create(session_id, user_id)
        except SessionOwnershipError:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This session belongs to a different user")
        conversation = self.conversations.get_or_create_open(session.session_id)

        self.conversations.add_message(
            Message(conversation_id=conversation.conversation_id, sender_role="user", content=text)
        )

        # Guardarraíl: lo que está claramente fuera del alcance de la tienda (o intenta
        # manipular al bot) se responde con una negativa fija, sin llamar al LLM.
        decision = self.scope_guard.check(text)
        if not decision.allowed:
            self.conversations.add_message(
                Message(
                    conversation_id=conversation.conversation_id,
                    sender_role="bot",
                    content=decision.reply,
                    intent_id=self.intents.resolve_intent_id_by_name(OFF_TOPIC_INTENT),
                )
            )
            return {"content": decision.reply}

        history = self.conversations.history(conversation.conversation_id)
        chat_messages = [
            {"role": "user" if m.sender_role == "user" else "assistant", "content": m.content} for m in history
        ]

        last_tool_used: str | None = None
        pending_product_query: tuple[str, list[str]] | None = None

        catalog_context = self.catalog.context_summary()

        for _ in range(MAX_TOOL_ITERATIONS):
            assistant_message = self.openai.chat(chat_messages, context=catalog_context)

            if not assistant_message.tool_calls:
                content = sanitize_reply(assistant_message.content or "")
                bot_message = self.conversations.add_message(
                    Message(
                        conversation_id=conversation.conversation_id,
                        sender_role="bot",
                        content=content,
                        intent_id=self.intents.resolve_intent_id(last_tool_used),
                    )
                )
                if pending_product_query is not None:
                    query_text, product_ids = pending_product_query
                    self.product_queries.log_query(bot_message.message_id, query_text, product_ids)
                return {"content": content}

            chat_messages.append(
                {
                    "role": "assistant",
                    "content": assistant_message.content,
                    "tool_calls": [tc.model_dump() for tc in assistant_message.tool_calls],
                }
            )

            for tool_call in assistant_message.tool_calls:
                last_tool_used = tool_call.function.name
                args = json.loads(tool_call.function.arguments or "{}")
                result = self._execute_tool(tool_call.function.name, args, user_id, conversation.conversation_id)
                if tool_call.function.name == "search_products":
                    pending_product_query = (args.get("query", ""), [p["id"] for p in result.get("products", [])])
                chat_messages.append(
                    {"role": "tool", "tool_call_id": tool_call.id, "content": json.dumps(result)}
                )

        return {"content": "Lo siento, no pude procesar tu solicitud en este momento."}

    def _execute_tool(self, name: str, args: dict, user_id: str | None, conversation_id: str) -> dict:
        if name == "search_products":
            products = self.catalog.search(args.get("query", ""))
            if not products:
                return {"products": [], "note": "Sin coincidencias; usa list_products para ver el catálogo."}
            return {"products": products}
        if name == "list_products":
            return {"products": self.catalog.list_products(args.get("category"))}
        if name == "get_product_details":
            product = self.catalog.get(args.get("product_id", ""))
            return {"product": product} if product else {"error": "Producto no encontrado"}
        if name == "get_recommendations":
            product_ids = self.recommendation_client.list_recommendations(
                user_id or "", args.get("seen_product_ids", [])
            )
            return {"products": self.catalog.get_many(product_ids)}
        if name == "get_cart":
            return self._cart_summary(user_id)
        if name == "add_to_cart":
            product = self.catalog.get(args.get("product_id", ""))
            if product is None:
                return {"ok": False, "error": "Producto no encontrado"}
            quantity = max(1, min(int(args.get("quantity") or 1), 10))
            ok = self.cart_client.add_item(user_id or "", product["id"], quantity)
            if not ok:
                return {"ok": False, "error": "No se pudo agregar al carrito en este momento"}
            return {"ok": True, "added": {"name": product["name"], "quantity": quantity}, "cart_url": "/cart"}
        if name == "search_faq":
            faqs = self.faqs.search(args.get("keyword", ""))
            return {"faqs": [{"question": f.question, "answer": f.answer} for f in faqs]}
        if name == "create_ticket":
            ticket = self.tickets.create(
                conversation_id=conversation_id,
                category=args.get("category", "general"),
                description=args.get("description", ""),
            )
            return {"ticket_id": ticket.ticket_id, "status": ticket.status}
        return {"error": f"herramienta desconocida: {name}"}

    def _cart_summary(self, user_id: str | None) -> dict:
        items = self.cart_client.get_cart(user_id or "")
        products = {p["id"]: p for p in self.catalog.get_many([i["product_id"] for i in items])}
        detailed, total = [], 0.0
        for item in items:
            product = products.get(item["product_id"])
            if product is None:
                detailed.append(item)
                continue
            subtotal = float(product["price_usd"]) * item["quantity"]
            total += subtotal
            detailed.append(
                {
                    "product_id": product["id"],
                    "name": product["name"],
                    "quantity": item["quantity"],
                    "unit_price_usd": product["price_usd"],
                    "subtotal_usd": f"{subtotal:.2f}",
                    "url": product["url"],
                }
            )
        return {"items": detailed, "total_usd": f"{total:.2f}", "cart_url": "/cart"}
