"""Unit tests for the busyness algorithm (no database or HTTP involved)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.busyness import NO_DATA, compute_status, score_to_level
from app.geo import distance_m
from app.models import BusyLevel

NOW = datetime(2026, 10, 1, 14, 0, tzinfo=timezone.utc)
NOT, MOD, BUSY = BusyLevel.NOT_BUSY, BusyLevel.MODERATE, BusyLevel.BUSY


def ago(minutes: float) -> datetime:
    return NOW - timedelta(minutes=minutes)


def test_no_reports_means_no_data():
    status = compute_status([], NOW)
    assert status.level == NO_DATA
    assert status.score is None
    assert status.report_count == 0


def test_reports_older_than_window_are_ignored():
    status = compute_status([(BUSY, ago(91)), (BUSY, ago(200))], NOW)
    assert status.level == NO_DATA


def test_report_exactly_at_window_edge_still_counts():
    assert compute_status([(BUSY, ago(90))], NOW).level == "busy"


@pytest.mark.parametrize("level", [NOT, MOD, BUSY])
def test_single_report_gives_its_own_level(level):
    assert compute_status([(level, ago(5))], NOW).level == level.value


def test_newer_report_outweighs_older_one():
    # Busy 60 min ago (weight 0.2) vs not busy just now (weight 1.0)
    status = compute_status([(BUSY, ago(60)), (NOT, ago(0))], NOW)
    assert status.level == "not_busy"
    # ...and the other way round
    status = compute_status([(NOT, ago(60)), (BUSY, ago(0))], NOW)
    assert status.level == "busy"


def test_equal_age_reports_average_out():
    # One busy + one not busy, same time -> average 1.0 -> moderate
    status = compute_status([(BUSY, ago(10)), (NOT, ago(10))], NOW)
    assert status.level == "moderate"
    assert status.score == 1.0


def test_weight_halves_at_half_life():
    # Busy (2) now with weight 1, not busy (0) at 15 min with weight 0.5
    # -> (2*1 + 0*0.5) / 1.5 = 1.33 -> moderate, just under the busy cutoff
    status = compute_status([(BUSY, ago(0)), (NOT, ago(15))], NOW, half_life_min=15)
    assert status.score == pytest.approx(1.33, abs=0.01)
    assert status.level == "moderate"


def test_counts_only_reports_in_window_and_reports_latest_time():
    status = compute_status([(MOD, ago(5)), (MOD, ago(30)), (BUSY, ago(120))], NOW)
    assert status.report_count == 2
    assert status.last_report_at == ago(5)


def test_naive_timestamps_are_treated_as_utc():
    naive = ago(5).replace(tzinfo=None)
    assert compute_status([(BUSY, naive)], NOW).level == "busy"


def test_future_timestamp_does_not_break_weights():
    # Small clock skew between machines shouldn't give a weight above 1
    status = compute_status([(BUSY, NOW + timedelta(seconds=30))], NOW)
    assert status.level == "busy"


@pytest.mark.parametrize(
    "score, expected",
    [(0, NOT), (0.66, NOT), (0.67, MOD), (1.33, MOD), (1.34, BUSY), (2, BUSY)],
)
def test_score_thresholds(score, expected):
    assert score_to_level(score) == expected


def test_distance_between_library_and_union():
    # About 212 m apart on campus
    d = distance_m(40.9152481, -73.1228800, 40.9171445, -73.1224921)
    assert 205 < d < 220


def test_distance_to_self_is_zero():
    assert distance_m(40.9, -73.1, 40.9, -73.1) == 0
