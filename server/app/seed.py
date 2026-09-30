"""
Adds the study spots to the database. Run with:  python -m app.seed

Safe to run more than once: spots that already exist (matched by slug) are
updated instead of duplicated. To add a spot, add a line to LOCATIONS and
re-run this.
"""

from sqlmodel import Session, select

from app.models import Location

# (slug, name, latitude, longitude)
LOCATIONS = [
    ("library", "Melville Library", 40.9152481, -73.1228800),
    ("union", "Student Union", 40.9171445, -73.1224921),
    ("wang", "Wang Center", 40.9161544, -73.1195538),
    ("sac", "SAC", 40.9142291, -73.1243844),
]


def seed_locations(session: Session) -> None:
    for slug, name, lat, lon in LOCATIONS:
        loc = session.exec(select(Location).where(Location.slug == slug)).first()
        if loc is None:
            session.add(Location(slug=slug, name=name, lat=lat, lon=lon))
        else:
            loc.name, loc.lat, loc.lon = name, lat, lon
    session.commit()


if __name__ == "__main__":
    from app.db import engine

    with Session(engine) as session:
        seed_locations(session)
    print(f"Seeded {len(LOCATIONS)} locations.")
