"""
Test setup shared by every test file.

Tests never touch Supabase. Each test gets a brand-new in-memory SQLite
database, so tests are fast, can run offline, and can't affect each other.
"""

import os

# Must be set before `app` is imported, because settings are read on import.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-that-is-at-least-32-bytes-long"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.db import get_session
from app.main import app
from app.models import Location
from app.seed import seed_locations


@pytest.fixture
def session():
    # StaticPool keeps one connection open, so the in-memory database lives
    # for the whole test instead of vanishing between queries.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_locations(session)
        yield session


@pytest.fixture
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def signup(client, email="wolfie@stonybrook.edu", password="password123", name="Wolfie"):
    return client.post("/api/auth/signup", json={"name": name, "email": email, "password": password})


@pytest.fixture
def auth_headers(client):
    token = signup(client).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def library(session) -> Location:
    return session.exec(select(Location).where(Location.slug == "library")).one()
