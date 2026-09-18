import os
import time

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"

import jwt  # noqa: E402
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


def _token(user_id: str, roles: list[str]) -> str:
    payload = {
        "sub": user_id,
        "email": f"{user_id}@example.com",
        "roles": roles,
        "type": "access",
        "iat": time.time(),
        "exp": time.time() + 3600,
    }
    return jwt.encode(payload, "test-secret", algorithm="HS256")


def _auth(user_id: str, roles: list[str]) -> dict:
    return {"Authorization": f"Bearer {_token(user_id, roles)}"}


def _seed_conversation(session_id: str, user_id: str, text: str = "hola"):
    service = ChatService(SessionLocal(), openai_client=FakeOpenAIClient([FakeMessage(content="ok")]))
    service.handle_message(session_id, user_id, text)


def test_customer_role_is_forbidden_from_admin_endpoints():
    client = TestClient(app)
    resp = client.get("/admin/conversations", headers=_auth("plain-user", ["customer"]))
    assert resp.status_code == 403


def test_unauthenticated_request_is_rejected():
    client = TestClient(app)
    assert client.get("/admin/stats").status_code == 401


def test_support_agent_can_list_conversations_and_see_preview():
    _seed_conversation("s1", "customer-1", "necesito ayuda con mi pedido")

    client = TestClient(app)
    resp = client.get("/admin/conversations", headers=_auth("agent-1", ["support_agent"]))
    assert resp.status_code == 200
    body = resp.json()
    assert body["conversations"][0]["user_id"] == "customer-1"
    assert body["conversations"][0]["message_count"] == 2
    # last_message_preview shows the most recent message (the bot's reply)
    assert body["conversations"][0]["last_message_preview"] == "ok"


def test_admin_can_read_full_conversation_messages():
    _seed_conversation("s2", "customer-2", "hola de nuevo")
    client = TestClient(app)

    conv_id = client.get("/admin/conversations", headers=_auth("admin-1", ["admin"])).json()["conversations"][0][
        "conversation_id"
    ]
    resp = client.get(f"/admin/conversations/{conv_id}/messages", headers=_auth("admin-1", ["admin"]))
    assert resp.status_code == 200
    assert [m["sender_role"] for m in resp.json()["messages"]] == ["user", "bot"]


def test_admin_stats_reflects_seeded_data():
    _seed_conversation("s3", "customer-3")
    client = TestClient(app)
    resp = client.get("/admin/stats", headers=_auth("admin-1", ["admin"]))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_conversations"] >= 1
    assert body["distinct_users"] >= 1


def test_ticket_lifecycle_list_and_resolve():
    db = SessionLocal()
    service = ChatService(
        db,
        openai_client=FakeOpenAIClient(
            [
                FakeMessage(
                    content=None,
                    tool_calls=[FakeToolCall("call_1", "create_ticket", {"category": "envio", "description": "no llegó"})],
                ),
                FakeMessage(content="Ticket creado."),
            ]
        ),
    )
    service.handle_message("s4", "customer-4", "mi pedido no llegó")

    client = TestClient(app)
    listed = client.get("/admin/tickets", headers=_auth("agent-1", ["support_agent"]))
    assert listed.status_code == 200
    ticket_id = listed.json()["tickets"][0]["ticket_id"]
    assert listed.json()["tickets"][0]["status"] == "open"

    resolved = client.patch(
        f"/admin/tickets/{ticket_id}", json={"status": "resolved"}, headers=_auth("agent-1", ["support_agent"])
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["resolved_at"] is not None

    open_only = client.get("/admin/tickets?status=open", headers=_auth("agent-1", ["support_agent"]))
    assert open_only.json()["tickets"] == []
