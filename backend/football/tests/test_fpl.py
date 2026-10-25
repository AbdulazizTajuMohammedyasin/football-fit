import json
from datetime import date

import pytest
from django.core.management import CommandError, call_command

from football.fpl import FplImportError, import_bootstrap, player_rows, season_label
from football.models import Club, DataSource, Player, PlayerSeason

pytestmark = pytest.mark.django_db


def element(id, element_type, team=1, minutes=900, **fields):
    base = {
        "id": id,
        "element_type": element_type,
        "team": team,
        "first_name": f"First{id}",
        "second_name": f"Second{id}",
        "web_name": f"Second{id}",
        "birth_date": "2000-01-15",
        "minutes": minutes,
        "goals_scored": 2,
        "expected_goals": "1.50",
        "assists": 1,
        "expected_assists": "0.90",
        "tackles": 10,
        "clearances_blocks_interceptions": 20,
        "recoveries": 30,
        "goals_conceded": 5,
        "expected_goals_conceded": "4.50",
        "clean_sheets": 3,
        "saves": 0,
        "removed": False,
    }
    base.update(fields)
    return base


def bootstrap(*elements):
    return {
        "events": [{"id": 1, "deadline_time": "2026-08-14T17:30:00Z"}],
        "teams": [
            {"id": 1, "name": "Arsenal", "short_name": "ARS"},
            {"id": 2, "name": "Chelsea", "short_name": "CHE"},
        ],
        "elements": list(elements),
    }


def test_season_label_comes_from_first_gameweek():
    assert season_label(bootstrap()) == "2026-27"
    with pytest.raises(FplImportError):
        season_label({"events": []})


def test_rows_convert_totals_to_per_90_and_map_broad_positions():
    rows, skipped = player_rows(bootstrap(element(1, 4, minutes=900)))
    assert skipped == 0
    row = rows[0]
    assert row["position"] == "FW"
    assert row["club"] == "Arsenal" and row["club_short_name"] == "ARS"
    assert row["season"] == "2026-27"
    assert row["metrics"]["goals_p90"] == 0.2
    assert row["metrics"]["xg_p90"] == 0.15
    assert row["metrics"]["ball_recoveries_p90"] == 3.0
    assert "saves_p90" not in row["metrics"]  # goalkeeper-only metrics
    assert row["date_of_birth"] == date(2000, 1, 15)
    assert row["nationality"] == "" and row["appearances"] is None


def test_goalkeepers_get_saves_and_derived_save_share():
    rows, _ = player_rows(bootstrap(element(1, 1, minutes=1800, saves=15, goals_conceded=5)))
    metrics = rows[0]["metrics"]
    assert rows[0]["position"] == "GK"
    assert metrics["saves_p90"] == 0.75
    assert metrics["save_share_pct"] == 75.0


def test_missing_fields_stay_missing_and_unused_players_have_no_metrics():
    sparse = element(1, 3)
    del sparse["tackles"]
    sparse["expected_goals"] = None
    rows, _ = player_rows(bootstrap(sparse, element(2, 2, minutes=0)))
    assert "tackles_p90" not in rows[0]["metrics"]
    assert "xg_p90" not in rows[0]["metrics"]
    assert rows[1]["metrics"] == {} and rows[1]["minutes"] == 0


def test_non_players_removed_and_unknown_teams_are_skipped():
    rows, skipped = player_rows(
        bootstrap(element(1, 5), element(2, 3, removed=True), element(3, 3, team=99), element(4, 3))
    )
    assert skipped == 3
    assert [row["player"] for row in rows] == ["First4 Second4"]


def test_invalid_numbers_raise():
    with pytest.raises(FplImportError, match="not a number"):
        player_rows(bootstrap(element(1, 3, expected_goals="lots")))


def test_import_writes_a_real_labelled_source_and_replaces_previous_import():
    data = bootstrap(element(1, 1, saves=10), element(2, 2, team=2), element(3, 4))
    result, skipped, season = import_bootstrap(data, date(2026, 10, 24))
    import_bootstrap(data, date(2026, 10, 24))

    source = DataSource.objects.get(slug="fpl")
    assert source.is_demo is False
    assert "No published licence" in source.licence
    assert (result.clubs, result.players, skipped, season) == (2, 3, 0, "2026-27")
    assert Club.objects.filter(source=source).count() == 2
    assert Player.objects.filter(source=source).count() == 3
    assert PlayerSeason.objects.filter(competition="Premier League", season="2026-27").count() == 3


def test_command_reads_a_saved_file(tmp_path):
    path = tmp_path / "bootstrap.json"
    path.write_text(json.dumps(bootstrap(element(1, 3))), encoding="utf-8")
    call_command("import_fpl", file=path, as_of="2026-10-24")
    assert DataSource.objects.get(slug="fpl").as_of == date(2026, 10, 24)


def test_command_rejects_bad_files(tmp_path):
    path = tmp_path / "bootstrap.json"
    path.write_text("not json", encoding="utf-8")
    with pytest.raises(CommandError, match="Could not read"):
        call_command("import_fpl", file=path)
    path.write_text(json.dumps({"events": [], "teams": [], "elements": []}), encoding="utf-8")
    with pytest.raises(CommandError, match="nothing was written"):
        call_command("import_fpl", file=path)
    assert not DataSource.objects.filter(slug="fpl").exists()


def test_very_long_names_get_slugs_that_fit_the_column():
    # 118 characters: fits the name column, but its slug must be cut to fit the slug column.
    surname = ("de Albuquerque " * 6).strip()
    long_name = element(1, 3, first_name="António João Pereira Tavares", second_name=surname)
    twin = element(2, 3, first_name="António João Pereira Tavares", second_name=surname)
    twin["birth_date"] = "2001-02-03"
    import_bootstrap(bootstrap(long_name, twin), date(2026, 10, 24))
    slugs = list(Player.objects.values_list("slug", flat=True))
    max_length = Player._meta.get_field("slug").max_length
    assert len(slugs) == 2 and len(set(slugs)) == 2
    assert all(len(slug) <= max_length for slug in slugs)


def test_names_longer_than_the_column_abort_the_import_cleanly():
    too_long = element(1, 3, second_name="x" * 200)
    with pytest.raises(FplImportError, match="longer than 120"):
        import_bootstrap(bootstrap(too_long), date(2026, 10, 24))
    assert not DataSource.objects.filter(slug="fpl").exists()
