from datetime import date

import pytest
from django.core.management import CommandError, call_command

from football.importers import CsvImportError, SourceInfo, import_csv
from football.models import DataSource, Player, PlayerSeason

pytestmark = pytest.mark.django_db

INFO = SourceInfo(slug="licensed", name="Licensed feed", as_of=date(2026, 5, 31), licence="ok")

VALID_CSV = (
    "club,player,position,season,date_of_birth,secondary_positions,minutes,np_xg_p90,xa_p90\n"
    "Test City,Alex Example,st,2025-26,2001-03-04,W;AM,1800,0.41,\n"
    "Test City,Sam Sample,CB,2025-26,,,900,,\n"
)


def write(tmp_path, text):
    path = tmp_path / "players.csv"
    path.write_text(text, encoding="utf-8")
    return path


def test_import_creates_clubs_players_and_keeps_blanks_missing(tmp_path):
    result = import_csv(write(tmp_path, VALID_CSV), INFO, "Premier League")
    assert (result.clubs, result.players, result.seasons) == (1, 2, 2)

    alex = Player.objects.get(name="Alex Example")
    assert alex.position == "ST"
    assert alex.secondary_positions == ["W", "AM"]
    season = PlayerSeason.objects.get(player=alex)
    assert season.metrics == {"np_xg_p90": 0.41}
    assert season.competition == "Premier League"
    assert Player.objects.get(name="Sam Sample").date_of_birth is None


def test_reimport_replaces_previous_rows_for_the_same_source(tmp_path):
    path = write(tmp_path, VALID_CSV)
    import_csv(path, INFO, "Premier League")
    import_csv(path, INFO, "Premier League")
    assert DataSource.objects.filter(slug="licensed").count() == 1
    assert Player.objects.count() == 2


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("club,player,season\nA,B,2025-26\n", "missing required columns"),
        ("club,player,position,season,secret\nA,B,ST,2025-26,1\n", "unknown columns"),
        ("club,player,position,season\nA,B,XX,2025-26\n", "unknown position"),
        ("club,player,position,season,minutes\nA,B,ST,2025-26,-5\n", "cannot be negative"),
        ("club,player,position,season,np_xg_p90\nA,B,ST,2025-26,lots\n", "must be a number"),
        ("club,player,position,season,date_of_birth\nA,B,ST,2025-26,04/03/2001\n", "YYYY-MM-DD"),
        ("club,player,position,season\n", "no data rows"),
    ],
)
def test_invalid_files_are_rejected_without_writing(tmp_path, text, message):
    with pytest.raises(CsvImportError, match=message):
        import_csv(write(tmp_path, text), INFO, "Premier League")
    assert not DataSource.objects.exists()


def test_command_refuses_reserved_demo_slug(tmp_path):
    with pytest.raises(CommandError, match="reserved"):
        call_command(
            "import_players_csv",
            str(write(tmp_path, VALID_CSV)),
            source_slug="demo",
            source_name="x",
            as_of="2026-05-31",
            licence="x",
        )


def test_command_imports_file(tmp_path):
    call_command(
        "import_players_csv",
        str(write(tmp_path, VALID_CSV)),
        source_slug="licensed",
        source_name="Licensed feed",
        as_of="2026-05-31",
        licence="Licensed for non-commercial display",
    )
    assert DataSource.objects.get(slug="licensed").is_demo is False
