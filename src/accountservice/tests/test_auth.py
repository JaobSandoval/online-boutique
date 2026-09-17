import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"

import pytest
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _client():
    global client
    with TestClient(app) as c:
        client = c
        yield


def _register(email="alice@example.com", password="supersecret1"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": "Alice"},
    )


def test_register_creates_customer_role():
    resp = _register()
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "alice@example.com"
    assert body["roles"] == ["customer"]


def test_register_duplicate_email_conflicts():
    _register()
    resp = _register()
    assert resp.status_code == 409


def test_login_and_me_flow():
    _register(email="bob@example.com")
    login = client.post("/auth/login", json={"email": "bob@example.com", "password": "supersecret1"})
    assert login.status_code == 200
    tokens = login.json()
    assert "access_token" in tokens and "refresh_token" in tokens

    me = client.get("/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "bob@example.com"


def test_login_wrong_password_rejected():
    _register(email="carol@example.com")
    resp = client.post("/auth/login", json={"email": "carol@example.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_refresh_rotates_token_and_invalidates_old():
    _register(email="dave@example.com")
    login = client.post("/auth/login", json={"email": "dave@example.com", "password": "supersecret1"})
    old_refresh = login.json()["refresh_token"]

    refreshed = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200

    reused = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


def test_logout_revokes_refresh_token():
    _register(email="erin@example.com")
    login = client.post("/auth/login", json={"email": "erin@example.com", "password": "supersecret1"})
    refresh_token = login.json()["refresh_token"]

    logout = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 204

    reused = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert reused.status_code == 401
