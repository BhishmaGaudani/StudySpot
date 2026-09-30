"""
Database connection.

`engine` is the single connection pool for the whole app. `get_session` is a
FastAPI dependency: each request gets its own session, which is closed when
the request finishes. Tests override `get_session` to use a throwaway database.
"""

from collections.abc import Iterator

from sqlmodel import Session, create_engine

from app.config import get_settings

# pool_pre_ping checks a connection is still alive before using it. Supabase
# closes idle connections, so without this the first request after a quiet
# period could fail.
engine = create_engine(get_settings().sqlalchemy_url, pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
