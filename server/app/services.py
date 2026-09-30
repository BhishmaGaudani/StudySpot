"""
Logic that needs the database but isn't tied to one route: building a spot's
live status and its "popular times" chart. Routes call these instead of
repeating the queries.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from app.busyness import SCORES, as_utc, compute_status
from app.config import get_settings
from app.models import BusyLevel, Location, Report
from app.schemas import HourBucket, LocationOut, PopularTimesOut


def _recent_reports(
    session: Session, now: datetime, location_ids: list[int]
) -> dict[int, list[tuple[BusyLevel, datetime]]]:
    """Reports inside the algorithm window, grouped by location, in one query."""
    cutoff = now - timedelta(minutes=get_settings().status_window_min)
    rows = session.exec(
        select(Report.location_id, Report.level, Report.created_at).where(
            Report.location_id.in_(location_ids), Report.created_at >= cutoff
        )
    ).all()
    grouped: dict[int, list[tuple[BusyLevel, datetime]]] = defaultdict(list)
    for location_id, level, created_at in rows:
        grouped[location_id].append((level, created_at))
    return grouped


def locations_with_status(session: Session, locations: list[Location]) -> list[LocationOut]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    reports = _recent_reports(session, now, [loc.id for loc in locations])

    out = []
    for loc in locations:
        status = compute_status(
            reports.get(loc.id, []),
            now,
            window_min=settings.status_window_min,
            half_life_min=settings.status_half_life_min,
        )
        out.append(
            LocationOut(
                id=loc.id,
                slug=loc.slug,
                name=loc.name,
                lat=loc.lat,
                lon=loc.lon,
                status=status.level,
                score=status.score,
                report_count=status.report_count,
                last_report_at=status.last_report_at,
            )
        )
    return out


def popular_times(session: Session, location_id: int, weeks: int = 8) -> PopularTimesOut:
    """
    Average busyness for each hour of the day, from the last `weeks` weeks of
    reports, like the "Popular times" chart on Google Maps.

    Grouping by hour is done in Python rather than SQL so it works the same on
    Postgres and on the SQLite database the tests use. For a few thousand
    reports this is fast; with millions you'd do it in SQL instead.
    """
    tz = ZoneInfo(get_settings().campus_timezone)
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    rows = session.exec(
        select(Report.level, Report.created_at).where(
            Report.location_id == location_id, Report.created_at >= since
        )
    ).all()

    totals = [0] * 24
    counts = [0] * 24
    for level, created_at in rows:
        hour = as_utc(created_at).astimezone(tz).hour
        totals[hour] += SCORES[BusyLevel(level)]
        counts[hour] += 1

    hours = [
        HourBucket(
            hour=h,
            avg_score=round(totals[h] / counts[h], 2) if counts[h] else None,
            report_count=counts[h],
        )
        for h in range(24)
    ]
    return PopularTimesOut(location_id=location_id, weeks=weeks, hours=hours)
