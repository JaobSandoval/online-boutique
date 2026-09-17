import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.services.chat_service import ChatService  # noqa: E402
from tests.fakes import FakeMessage, FakeOpenAIClient, FakeToolCall  # noqa: E402


@pytest.fixture(autouse=True)
def _app_lifespan():
    with TestClient(app):
        yield


def _service(responses):
    return ChatService(SessionLocal(), openai_client=FakeOpenAIClient(responses))


def test_simple_reply_without_tools_is_persisted():
    service = _service([FakeMessage(content="¡Hola! ¿En qué puedo ayudarte?")])
    result = service.handle_message("session-1", None, "hola")
    assert result["content"] == "¡Hola! ¿En qué puedo ayudarte?"

    client = TestClient(app)
    history = client.get("/chat/session-1/history").json()
    assert [m["sender_role"] for m in history["messages"]] == ["user", "bot"]


def test_search_products_tool_call_logs_query_and_replies():
    responses = [
        FakeMessage(
            content=None,
            tool_calls=[FakeToolCall("call_1", "search_products", {"query": "algo para acampar"})],
        ),
        FakeMessage(content="Encontré algunas opciones de camping."),
    ]
    service = _service(responses)
    result = service.handle_message("session-2", "user-42", "busco algo para acampar")
    assert result["content"] == "Encontré algunas opciones de camping."


def test_create_ticket_tool_call_creates_ticket():
    responses = [
        FakeMessage(
            content=None,
            tool_calls=[
                FakeToolCall(
                    "call_1",
                    "create_ticket",
                    {"category": "envio", "description": "mi paquete no llegó"},
                )
            ],
        ),
        FakeMessage(content="Abrí un ticket de soporte para tu envío."),
    ]
    service = _service(responses)
    result = service.handle_message("session-3", None, "mi paquete no llegó")
    assert "ticket" in result["content"].lower()


def test_anonymous_session_has_null_user_id():
    service = _service([FakeMessage(content="ok")])
    service.handle_message("session-anon", None, "hola")
    session = service.sessions.get("session-anon")
    assert session.user_id is None


def test_authenticated_session_stores_user_id():
    service = _service([FakeMessage(content="ok")])
    service.handle_message("session-auth", "user-7", "hola")
    session = service.sessions.get("session-auth")
    assert session.user_id == "user-7"
