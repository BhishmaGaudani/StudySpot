"""Read-only endpoints for study spots: live status and popular times."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.deps import SessionDep
from app.models import Location
from app.schemas import LocationOut, PopularTimesOut
from app.services import locations_with_status, popular_times

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationOut])
def list_locations(session: SessionDep) -> list[LocationOut]:
    # Status is computed fresh on every request, so a spot with no recent
    # reports fades to "no_data" on its own; nothing has to clean it up.
    locations = session.exec(select(Location).order_by(Location.id)).all()
    return locations_with_status(session, list(locations))


@router.get("/{location_id}/popular-times", response_model=PopularTimesOut)
def get_popular_times(
    location_id: int,
    session: SessionDep,
    weeks: int = Query(default=8, ge=1, le=52),
) -> PopularTimesOut:
    if session.get(Location, location_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Location not found")
    return popular_times(session, location_id, weeks)
