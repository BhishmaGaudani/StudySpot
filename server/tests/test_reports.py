"""Report rules (distance, cooldown), live status, WebSocket broadcast, popular times."""

from datetime import datetime, timedelta, timezone

from app.models import Report
from tests.conftest import signup


def report(client, headers, location, level="busy", lat=None, lon=None):
    return client.post(
        "/api/reports",
        headers=headers,
        json={
            "location_id": location.id,
            "level": level,
            "lat": location.lat if lat is None else lat,
            "lon": location.lon if lon is None else lon,
        },
    )


def test_locations_start_with_no_data(client):
    res = client.get("/api/locations")
    assert res.status_code == 200
    spots = res.json()
    assert [s["slug"] for s in spots] == ["library", "union", "wang", "sac"]
    assert all(s["status"] == "no_data" for s in spots)


def test_report_requires_login(client, library):
    assert report(client, {}, library).status_code == 401


def test_report_at_the_spot_succeeds_and_updates_status(client, auth_headers, library):
    res = report(client, auth_headers, library, level="busy")
    assert res.status_code == 201
    assert res.json()["location"]["status"] == "busy"
    assert res.json()["location"]["report_count"] == 1

    spots = {s["slug"]: s for s in client.get("/api/locations").json()}
    assert spots["library"]["status"] == "busy"
    assert spots["union"]["status"] == "no_data"


def test_report_just_inside_radius_succeeds(client, auth_headers, library):
    # ~90 m north of the library (0.00081 degrees latitude ≈ 90 m)
    res = report(client, auth_headers, library, lat=library.lat + 0.00081)
    assert res.status_code == 201


def test_report_too_far_away_is_rejected(client, auth_headers, library):
    # ~110 m north of the library
    res = report(client, auth_headers, library, lat=library.lat + 0.00099)
    assert res.status_code == 403
    assert "within 100 m" in res.json()["detail"]


def test_report_from_another_spot_is_rejected(client, auth_headers, library):
    union_lat, union_lon = 40.9171445, -73.1224921  # ~212 m away
    res = report(client, auth_headers, library, lat=union_lat, lon=union_lon)
    assert res.status_code == 403


def test_report_unknown_location_is_404(client, auth_headers):
    res = client.post(
        "/api/reports",
        headers=auth_headers,
        json={"location_id": 999, "level": "busy", "lat": 40.9, "lon": -73.1},
    )
    assert res.status_code == 404


def test_report_invalid_level_is_422(client, auth_headers, library):
    assert report(client, auth_headers, library, level="packed").status_code == 422


def test_second_report_within_30_min_is_rejected(client, auth_headers, library):
    assert report(client, auth_headers, library).status_code == 201
    res = report(client, auth_headers, library, level="not_busy")
    assert res.status_code == 429
    assert "Try again in 30 min" in res.json()["detail"]
    assert res.headers["Retry-After"] == "1800"


def test_cooldown_is_per_location(client, auth_headers, session, library):
    from app.models import Location
    from sqlmodel import select

    union = session.exec(select(Location).where(Location.slug == "union")).one()
    assert report(client, auth_headers, library).status_code == 201
    assert report(client, auth_headers, union).status_code == 201


def test_cooldown_is_per_user(client, auth_headers, library):
    assert report(client, auth_headers, library).status_code == 201
    other = signup(client, email="seawolf@stonybrook.edu").json()["access_token"]
    res = report(client, {"Authorization": f"Bearer {other}"}, library)
    assert res.status_code == 201


def test_can_report_again_after_cooldown(client, auth_headers, session, library):
    # Pretend the user's last report was 31 minutes ago
    session.add(
        Report(
            user_id=1,
            location_id=library.id,
            level="busy",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=31),
        )
    )
    session.commit()
    assert report(client, auth_headers, library).status_code == 201


def test_cooldowns_endpoint_lists_blocked_spots(client, auth_headers, library):
    assert client.get("/api/reports/cooldowns", headers=auth_headers).json() == []
    report(client, auth_headers, library)
    cooldowns = client.get("/api/reports/cooldowns", headers=auth_headers).json()
    assert [c["location_id"] for c in cooldowns] == [library.id]


def test_old_reports_fade_to_no_data(client, session, library):
    session.add(
        Report(
            user_id=1,
            location_id=library.id,
            level="busy",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=120),
        )
    )
    session.commit()
    spots = {s["slug"]: s for s in client.get("/api/locations").json()}
    assert spots["library"]["status"] == "no_data"


def test_report_is_broadcast_over_websocket(client, auth_headers, library):
    with client.websocket_connect("/api/ws") as ws:
        report(client, auth_headers, library, level="moderate")
        msg = ws.receive_json()
    assert msg["type"] == "location_update"
    assert msg["location"]["slug"] == "library"
    assert msg["location"]["status"] == "moderate"


def test_rejected_report_is_not_broadcast(client, auth_headers, library, session):
    from app.realtime import manager

    sent = []

    async def fake_broadcast(message):
        sent.append(message)

    original = manager.broadcast
    manager.broadcast = fake_broadcast
    try:
        report(client, auth_headers, library, lat=library.lat + 0.01)  # too far
    finally:
        manager.broadcast = original
    assert sent == []


def test_popular_times_groups_by_campus_hour(client, session, library):
    # 18:00 UTC on Oct 1 = 2 PM in New York (EDT, UTC-4)
    base = datetime.now(timezone.utc).replace(hour=18, minute=0, second=0, microsecond=0)
    base -= timedelta(days=1)
    for level in ["busy", "moderate"]:
        session.add(Report(user_id=1, location_id=library.id, level=level, created_at=base))
    session.commit()

    res = client.get(f"/api/locations/{library.id}/popular-times")
    assert res.status_code == 200
    hours = res.json()["hours"]
    assert len(hours) == 24
    busy_hours = [h for h in hours if h["report_count"]]
    assert len(busy_hours) == 1
    assert busy_hours[0]["hour"] in (13, 14)  # 13 in winter (EST), 14 in summer (EDT)
    assert busy_hours[0]["avg_score"] == 1.5
    assert busy_hours[0]["report_count"] == 2


def test_popular_times_unknown_location_is_404(client):
    assert client.get("/api/locations/999/popular-times").status_code == 404
