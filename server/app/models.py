"""
Database tables, defined as SQLModel classes.

  users      one row per account
  locations  the study spots (seeded by `python -m app.seed`)
  reports    one row every time a student says how busy a spot is

A spot's busyness is never stored. It is always computed from recent
reports (see busyness.py), so it can't go stale.
"""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, Column, DateTime, Index, String
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BusyLevel(str, Enum):
    NOT_BUSY = "not_busy"
    MODERATE = "moderate"
    BUSY = "busy"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    name: str = Field(max_length=100)
    password_hash: str = Field(max_length=100)
    created_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False)
    )


class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(max_length=50, unique=True)  # stable id, e.g. "library"
    name: str = Field(max_length=100)
    lat: float
    lon: float


class Report(SQLModel, table=True):
    __tablename__ = "reports"
    __table_args__ = (
        # Most queries are "reports for location X since time T", so index that pair.
        Index("ix_reports_location_created", "location_id", "created_at"),
        # The database itself rejects any level other than these three.
        CheckConstraint("level IN ('not_busy', 'moderate', 'busy')", name="ck_reports_level"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    location_id: int = Field(foreign_key="locations.id")
    # Stored as plain text ("busy") rather than a Postgres ENUM type, which is
    # awkward to change later in migrations.
    level: BusyLevel = Field(sa_column=Column(String(20), nullable=False))
    created_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False)
    )
