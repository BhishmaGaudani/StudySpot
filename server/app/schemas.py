"""
Request and response shapes for the API.

These are kept separate from the database models on purpose: a response
should never leak fields like `password_hash`, and a request shouldn't let
the client set fields like `user_id` or `created_at`.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.config import get_settings
from app.models import BusyLevel


# ---------- auth ----------

class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    # bcrypt only looks at the first 72 bytes, so cap the length there.
    password: str = Field(min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name can't be blank")
        return v

    @field_validator("email")
    @classmethod
    def campus_email_only(cls, v: str) -> str:
        v = v.lower()
        domain = get_settings().allowed_email_domain
        if not v.endswith("@" + domain):
            raise ValueError(f"Use your @{domain} email")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- locations ----------

class LocationOut(BaseModel):
    id: int
    slug: str
    name: str
    lat: float
    lon: float
    status: str  # not_busy | moderate | busy | no_data
    score: float | None
    report_count: int
    last_report_at: datetime | None


class HourBucket(BaseModel):
    hour: int  # 0-23, campus local time
    avg_score: float | None  # 0 (empty) .. 2 (packed); None = no reports
    report_count: int


class PopularTimesOut(BaseModel):
    location_id: int
    weeks: int
    hours: list[HourBucket]


# ---------- reports ----------

class ReportIn(BaseModel):
    location_id: int
    level: BusyLevel
    # Where the user is right now. The server re-checks the distance itself
    # instead of trusting the browser's "you're close enough".
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class ReportOut(BaseModel):
    id: int
    location_id: int
    level: BusyLevel
    created_at: datetime
    location: LocationOut  # the spot's new status after this report


class CooldownOut(BaseModel):
    location_id: int
    next_report_at: datetime
