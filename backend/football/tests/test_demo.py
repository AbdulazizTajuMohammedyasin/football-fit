import pytest
from django.core.management import call_command

from football.demo import CLUB_NAMES, DEMO_SOURCE_SLUG, build_demo_dataset
from football.metrics import validate_metrics
from football.models import Club, DataSource, Player, PlayerSeason

pytestmark = pytest.mark.django_db


def test_demo_dataset_is_flagged_as_demo():
    build_demo_dataset()
    source = DataSource.objects.get(slug=DEMO_SOURCE_SLUG)
    assert source.is_demo is True
    assert "fictional" in source.name.lower()
    assert Club.objects.filter(source=source).count() == len(CLUB_NAMES)


def test_demo_dataset_is_deterministic():
    build_demo_dataset(seed=7)
    first = list(
        PlayerSeason.objects.order_by("player__slug").values_list("player__slug", "metrics")
    )
    build_demo_dataset(seed=7)
    second = list(
        PlayerSeason.objects.order_by("player__slug").values_list("player__slug", "metrics")
    )
    assert first == second


def test_demo_metrics_are_valid_and_some_are_missing():
    summary = build_demo_dataset()
    assert summary.missing_metric_values > 0
    for season in PlayerSeason.objects.all():
        assert validate_metrics(season.metrics) == season.metrics
        if season.minutes == 0:
            assert season.metrics == {}


def test_seed_demo_replaces_only_demo_data():
    real = DataSource.objects.create(slug="real", name="Real", as_of="2026-05-31")
    Player.objects.create(source=real, slug="kept", name="Kept", position="ST")
    call_command("seed_demo")
    call_command("seed_demo")
    assert DataSource.objects.filter(slug=DEMO_SOURCE_SLUG).count() == 1
    assert Player.objects.filter(slug="kept").exists()
