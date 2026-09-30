"""
Submitting busyness reports.

POST /reports runs these checks, in order, before saving anything:
  1. You're logged in                    (else 401)
  2. The spot exists                     (else 404)
  3. You're within 100 m of it           (else 403)
  4. You haven't reported it in 30 min   (else 429, "Too Many Requests")

After saving, the spot's new status is broadcast to every open browser.

A note on (3): the server re-does the distance math itself instead of trusting
a "near: true" flag from the browser. It still has to trust the coordinates
the browser sends, since a website can't prove where a phone really is. The
cooldown in (4) limits how much damage a faked location can do.
"""

import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlmodel import func, select

from app.busyness import as_utc
from app.config import get_settings
from app.deps import CurrentUser, SessionDep
from app.geo import distance_m
from app.models import Location, Report, User
from app.realtime import manager
from app.schemas import CooldownOut, ReportIn, ReportOut
from app.services import locations_with_status

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ReportIn,
    user: CurrentUser,
    session: SessionDep,
    background: BackgroundTasks,
) -> ReportOut:
    settings = get_settings()

    location = session.get(Location, body.location_id)
    if location is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Location not found")

    dist = distance_m(body.lat, body.lon, location.lat, location.lon)
    if dist > settings.report_radius_m:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"You need to be within {settings.report_radius_m:.0f} m of {location.name} "
            f"to report (you're {dist:.0f} m away)",
        )

    # Lock this user's row until we commit. If the same user sends two reports
    # at the same moment (double-click, two tabs), the second waits here and
    # then sees the first one, so both can't slip past the cooldown check.
    # (Postgres honors this; SQLite, used in tests, ignores it.)
    session.exec(select(User).where(User.id == user.id).with_for_update()).one()

    now = datetime.now(timezone.utc)
    last = session.exec(
        select(func.max(Report.created_at)).where(
            Report.user_id == user.id, Report.location_id == location.id
        )
    ).one()
    if last is not None:
        next_allowed = as_utc(last) + timedelta(minutes=settings.report_cooldown_min)
        if now < next_allowed:
            wait_min = math.ceil((next_allowed - now).total_seconds() / 60)
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"You already reported {location.name} recently. Try again in {wait_min} min.",
                headers={"Retry-After": str(wait_min * 60)},
            )

    report = Report(user_id=user.id, location_id=location.id, level=body.level, created_at=now)
    session.add(report)
    session.commit()
    session.refresh(report)

    [updated] = locations_with_status(session, [location])

    # Runs after the response is sent, so the reporter isn't kept waiting
    # while every other browser gets notified.
    background.add_task(
        manager.broadcast, {"type": "location_update", "location": updated.model_dump(mode="json")}
    )

    return ReportOut(
        id=report.id,
        location_id=report.location_id,
        level=report.level,
        created_at=report.created_at,
        location=updated,
    )


@router.get("/cooldowns", response_model=list[CooldownOut])
def my_cooldowns(user: CurrentUser, session: SessionDep) -> list[CooldownOut]:
    """Spots this user can't report yet, and when they can. The app uses this
    to avoid asking "How busy is it?" when the answer would be rejected."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    rows = session.exec(
        select(Report.location_id, func.max(Report.created_at))
        .where(Report.user_id == user.id)
        .group_by(Report.location_id)
    ).all()

    out = []
    for location_id, last in rows:
        next_at = as_utc(last) + timedelta(minutes=settings.report_cooldown_min)
        if next_at > now:
            out.append(CooldownOut(location_id=location_id, next_report_at=next_at))
    return out
