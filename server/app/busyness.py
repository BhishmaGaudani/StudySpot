"""
The busyness algorithm: turn a list of student reports into one status.

This file is pure Python with no database or web code, so it is easy to
unit test and easy to explain.

How it works
------------
1. Only reports from the last `window_min` minutes (default 90) count.
   Nothing recent -> "no_data".
2. Each report becomes a score: not_busy = 0, moderate = 1, busy = 2.
3. Each score gets a weight that shrinks as the report gets older:

       weight = 1 / (1 + age_minutes / half_life)

   With half_life = 15, a brand-new report has weight 1, a 15-minute-old
   one has 0.5, and a 45-minute-old one has 0.25.
4. The weighted average score (0 to 2) is mapped back to a level:
       < 0.67 -> not_busy,  < 1.34 -> moderate,  otherwise busy
   (the 0-2 range cut into thirds).

Why not just use the latest report? One person's report can be wrong or
outdated. A weighted average lets several recent reports agree while still
reacting quickly when things change.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.models import BusyLevel

SCORES: dict[BusyLevel, int] = {
    BusyLevel.NOT_BUSY: 0,
    BusyLevel.MODERATE: 1,
    BusyLevel.BUSY: 2,
}

NO_DATA = "no_data"


@dataclass
class BusyStatus:
    level: str  # "not_busy" | "moderate" | "busy" | "no_data"
    score: float | None  # weighted average, 0..2 (None when no data)
    report_count: int  # how many reports were inside the window
    last_report_at: datetime | None


def as_utc(dt: datetime) -> datetime:
    # SQLite (used in tests) drops timezone info, so treat naive times as UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def score_to_level(score: float) -> BusyLevel:
    if score < 0.67:
        return BusyLevel.NOT_BUSY
    if score < 1.34:
        return BusyLevel.MODERATE
    return BusyLevel.BUSY


def compute_status(
    reports: list[tuple[BusyLevel, datetime]],
    now: datetime,
    window_min: int = 90,
    half_life_min: float = 15.0,
) -> BusyStatus:
    """`reports` is a list of (level, created_at) pairs, in any order."""
    cutoff = now - timedelta(minutes=window_min)
    recent = [(BusyLevel(level), as_utc(t)) for level, t in reports if as_utc(t) >= cutoff]

    if not recent:
        return BusyStatus(level=NO_DATA, score=None, report_count=0, last_report_at=None)

    total = 0.0
    weight_sum = 0.0
    for level, created_at in recent:
        # max(0, ...) guards against small clock differences making age negative
        age_min = max(0.0, (now - created_at).total_seconds() / 60)
        weight = 1 / (1 + age_min / half_life_min)
        total += SCORES[level] * weight
        weight_sum += weight

    score = total / weight_sum
    return BusyStatus(
        level=score_to_level(score).value,
        score=round(score, 2),
        report_count=len(recent),
        last_report_at=max(t for _, t in recent),
    )
