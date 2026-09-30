"""Signup, login and protected-route tests."""

import pytest

from tests.conftest import signup


def test_signup_returns_token_and_user(client):
    res = signup(client)
    assert res.status_code == 201
    body = res.json()
    assert body["access_token"]
    assert body["user"] == {"id": 1, "name": "Wolfie", "email": "wolfie@stonybrook.edu"}
    assert "password_hash" not in body["user"]


def test_signup_lowercases_email(client):
    res = signup(client, email="Wolfie@StonyBrook.edu")
    assert res.json()["user"]["email"] == "wolfie@stonybrook.edu"


@pytest.mark.parametrize(
    "email",
    ["wolfie@gmail.com", "wolfie@stonybrook.edu.evil.com", "wolfie@notstonybrook.edu", "not-an-email"],
)
def test_signup_rejects_non_campus_email(client, email):
    assert signup(client, email=email).status_code == 422


def test_signup_rejects_short_password(client):
    assert signup(client, password="short").status_code == 422


def test_signup_rejects_blank_name(client):
    assert signup(client, name="   ").status_code == 422


def test_signup_rejects_duplicate_email(client):
    signup(client)
    res = signup(client, email="WOLFIE@stonybrook.edu")
    assert res.status_code == 409


def test_password_is_hashed_not_stored_plainly(client, session):
    from app.models import User

    signup(client, password="password123")
    user = session.get(User, 1)
    assert user.password_hash != "password123"
    assert user.password_hash.startswith("$2b$")  # bcrypt


def test_login_with_correct_password(client):
    signup(client)
    res = client.post(
        "/api/auth/login", json={"email": "wolfie@stonybrook.edu", "password": "password123"}
    )
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_login_is_case_insensitive_on_email(client):
    signup(client)
    res = client.post(
        "/api/auth/login", json={"email": "WOLFIE@stonybrook.edu", "password": "password123"}
    )
    assert res.status_code == 200


@pytest.mark.parametrize(
    "email, password",
    [("wolfie@stonybrook.edu", "wrong-password"), ("nobody@stonybrook.edu", "password123")],
)
def test_login_failures_give_same_error(client, email, password):
    signup(client)
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 401
    assert res.json()["detail"] == "Wrong email or password"


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_bad_token(client):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.token"})
    assert res.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "wolfie@stonybrook.edu"


def test_expired_token_is_rejected(client, auth_headers, monkeypatch):
    from app import security
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "jwt_expire_minutes", -1)
    token = security.create_access_token(1)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
