import os
import time

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402
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


def _token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "email": f"{user_id}@example.com",
        "roles": ["customer"],
        "type": "access",
        "iat": time.time(),
        "exp": time.time() + 3600,
    }
    return jwt.encode(payload, "test-secret", algorithm="HS256")


def _auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {_token(user_id)}"}


def test_simple_reply_is_persisted_and_readable_by_its_owner():
    service = _service([FakeMessage(content="¡Hola! ¿En qué puedo ayudarte?")])
    result = service.handle_message("session-1", "user-1", "hola")
    assert result["content"] == "¡Hola! ¿En qué puedo ayudarte?"

    client = TestClient(app)
    history = client.get("/chat/session-1/history", headers=_auth("user-1")).json()
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
    result = service.handle_message("session-3", "user-9", "mi paquete no llegó")
    assert "ticket" in result["content"].lower()


def test_authenticated_session_stores_user_id():
    service = _service([FakeMessage(content="ok")])
    service.handle_message("session-auth", "user-7", "hola")
    session = service.sessions.get("session-auth")
    assert session.user_id == "user-7"


def test_reusing_another_users_session_id_is_rejected():
    service = _service([FakeMessage(content="ok"), FakeMessage(content="ok")])
    service.handle_message("shared-session", "user-a", "hola")
    with pytest.raises(HTTPException) as exc_info:
        service.handle_message("shared-session", "user-b", "hola")
    assert exc_info.value.status_code == 403


def test_chat_and_history_endpoints_require_auth():
    client = TestClient(app)
    assert client.post("/chat", json={"session_id": "s", "message": "hi"}).status_code == 401
    assert client.get("/chat/s/history").status_code == 401


def test_history_endpoint_rejects_other_users_session():
    service = _service([FakeMessage(content="ok")])
    service.handle_message("session-owned", "owner", "hola")

    client = TestClient(app)
    resp = client.get("/chat/session-owned/history", headers=_auth("someone-else"))
    assert resp.status_code == 404


def test_get_or_create_session_is_stable_per_user():
    client = TestClient(app)
    first = client.get("/chat/session", headers=_auth("user-stable"))
    second = client.get("/chat/session", headers=_auth("user-stable"))
    assert first.status_code == 200
    assert first.json()["session_id"] == second.json()["session_id"]
