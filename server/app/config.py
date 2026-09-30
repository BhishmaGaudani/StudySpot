"""
App settings, loaded from environment variables (or server/.env).

Keeping every tunable number here (radius, cooldown, algorithm window) means
the rules of the app live in one place instead of being scattered as magic
numbers through the code.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase gives you a "postgresql://..." string. SQLAlchemy needs to know
    # which driver to use, so we rewrite it to "postgresql+psycopg://..." below.
    database_url: str

    # Secret used to sign login tokens (JWTs). Anyone with this can forge logins.
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Only people with this email domain can sign up.
    allowed_email_domain: str = "stonybrook.edu"

    # Where the React dev server runs, so the browser is allowed to call the API.
    client_origin: str = "http://localhost:5173"

    # Report rules
    report_radius_m: float = 100.0  # must be this close to a spot to report
    report_cooldown_min: int = 30  # one report per spot per user this often

    # Busyness algorithm
    status_window_min: int = 90  # ignore reports older than this
    status_half_life_min: float = 15.0  # a report this old counts half as much

    # Campus timezone, used to group reports by hour for "popular times"
    campus_timezone: str = "America/New_York"

    @property
    def sqlalchemy_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
