from datetime import date

import pytest
from django.core.exceptions import ValidationError

from football.models import DataSource, Player, PlayerSeason


@pytest.fixture
def source(db):
    return DataSource.objects.create(slug="test", name="Test", as_of=date(2026, 5, 31))


def test_age_on_handles_birthday_not_yet_reached(source):
    player = Player(
        source=source, slug="p", name="P", position="ST", date_of_birth=date(2000, 6, 1)
    )
    assert player.age_on(date(2026, 5, 31)) == 25
    assert player.age_on(date(2026, 6, 1)) == 26


def test_age_is_none_without_birth_date(source):
    player = Player(source=source, slug="p", name="P", position="ST")
    assert player.age_on(date(2026, 5, 31)) is None


def test_season_clean_rejects_unknown_metrics(source):
    player = Player.objects.create(source=source, slug="p", name="P", position="ST")
    season = PlayerSeason(player=player, season="2025-26", metrics={"bogus": 1})
    with pytest.raises(ValidationError):
        season.full_clean()
