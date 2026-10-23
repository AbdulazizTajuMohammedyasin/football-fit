"""Import licensed player data from a CSV file.

Expected columns (header row required):

    club, player, position, season
    optional: date_of_birth (YYYY-MM-DD), nationality, secondary_positions (";"-separated),
              preferred_foot, competition, appearances, minutes, and any metric key from
              `football.metrics.METRICS`.

Blank cells are treated as missing, never as zero. The whole file is validated
before anything is written; any error aborts the import.
"""

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from django.db import transaction
from django.utils.text import slugify

from .metrics import METRICS_BY_KEY, MetricValidationError, validate_metrics
from .models import Club, DataSource, Player, PlayerSeason
from .positions import POSITION_ORDER

REQUIRED_COLUMNS = {"club", "player", "position", "season"}
OPTIONAL_COLUMNS = {
    "date_of_birth",
    "nationality",
    "secondary_positions",
    "preferred_foot",
    "competition",
    "appearances",
    "minutes",
}
FEET = {"left", "right", "both"}


class CsvImportError(ValueError):
    """Raised with a row-numbered message when the CSV is invalid."""


@dataclass
class SourceInfo:
    slug: str
    name: str
    as_of: date
    licence: str = ""
    url: str = ""
    notes: str = ""
    is_demo: bool = False


@dataclass
class ImportResult:
    clubs: int
    players: int
    seasons: int


def _optional_int(value: str, column: str, row_number: int) -> int | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        number = int(value)
    except ValueError as exc:
        raise CsvImportError(f"row {row_number}: {column} must be a whole number") from exc
    if number < 0:
        raise CsvImportError(f"row {row_number}: {column} cannot be negative")
    return number


def _parse_row(row: dict, row_number: int, default_competition: str) -> dict:
    for column in REQUIRED_COLUMNS:
        if not (row.get(column) or "").strip():
            raise CsvImportError(f"row {row_number}: '{column}' is required")

    position = row["position"].strip().upper()
    if position not in POSITION_ORDER:
        raise CsvImportError(f"row {row_number}: unknown position '{position}'")

    secondary = [
        item.strip().upper()
        for item in (row.get("secondary_positions") or "").split(";")
        if item.strip()
    ]
    if any(item not in POSITION_ORDER for item in secondary):
        raise CsvImportError(f"row {row_number}: invalid secondary_positions")

    foot = (row.get("preferred_foot") or "").strip().lower()
    if foot and foot not in FEET:
        raise CsvImportError(f"row {row_number}: preferred_foot must be left, right or both")

    dob_raw = (row.get("date_of_birth") or "").strip()
    try:
        date_of_birth = date.fromisoformat(dob_raw) if dob_raw else None
    except ValueError as exc:
        raise CsvImportError(f"row {row_number}: date_of_birth must be YYYY-MM-DD") from exc

    metric_values = {key: row[key] for key in row if key in METRICS_BY_KEY}
    try:
        metrics = validate_metrics(metric_values)
    except MetricValidationError as exc:
        raise CsvImportError(f"row {row_number}: {exc}") from exc

    return {
        "club": row["club"].strip(),
        "player": row["player"].strip(),
        "position": position,
        "season": row["season"].strip(),
        "competition": (row.get("competition") or "").strip() or default_competition,
        "secondary_positions": secondary,
        "preferred_foot": foot,
        "date_of_birth": date_of_birth,
        "nationality": (row.get("nationality") or "").strip(),
        "appearances": _optional_int(row.get("appearances"), "appearances", row_number),
        "minutes": _optional_int(row.get("minutes"), "minutes", row_number),
        "metrics": metrics,
    }


def read_rows(path: Path, default_competition: str) -> list[dict]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        headers = {header.strip() for header in (reader.fieldnames or [])}
        missing = REQUIRED_COLUMNS - headers
        if missing:
            raise CsvImportError(f"missing required columns: {', '.join(sorted(missing))}")
        unknown = headers - REQUIRED_COLUMNS - OPTIONAL_COLUMNS - set(METRICS_BY_KEY)
        if unknown:
            raise CsvImportError(f"unknown columns: {', '.join(sorted(unknown))}")
        rows = []
        for row_number, raw in enumerate(reader, start=2):
            row = {key.strip(): value for key, value in raw.items() if key is not None}
            rows.append(_parse_row(row, row_number, default_competition))
    if not rows:
        raise CsvImportError("the file contains no data rows")
    return rows


def _unique_slug(model, base: str, taken: set[str]) -> str:
    slug = base or "item"
    suffix = 2
    while slug in taken or model.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"
        suffix += 1
    taken.add(slug)
    return slug


@transaction.atomic
def import_csv(path: Path, info: SourceInfo, default_competition: str) -> ImportResult:
    """Validate and import a CSV, replacing any data previously imported under `info.slug`."""
    return write_rows(read_rows(path, default_competition), info)


@transaction.atomic
def write_rows(rows: list[dict], info: SourceInfo) -> ImportResult:
    """Replace the data source `info.slug` with already-validated rows.

    Each row holds the keys produced by `_parse_row`, plus an optional `club_short_name`.
    """
    DataSource.objects.filter(slug=info.slug).delete()
    source = DataSource.objects.create(
        slug=info.slug,
        name=info.name,
        as_of=info.as_of,
        licence=info.licence,
        url=info.url,
        notes=info.notes,
        is_demo=info.is_demo,
    )

    taken_slugs: set[str] = set()
    clubs: dict[str, Club] = {}
    players: dict[tuple, Player] = {}
    seasons = 0

    for row in rows:
        club = clubs.get(row["club"])
        if club is None:
            club = Club.objects.create(
                source=source,
                slug=_unique_slug(Club, slugify(row["club"]), taken_slugs),
                name=row["club"],
                short_name=row.get("club_short_name", ""),
                competition=row["competition"],
            )
            clubs[row["club"]] = club

        # A player is identified by name plus date of birth within one import.
        player_key = (row["player"], row["date_of_birth"])
        player = players.get(player_key)
        if player is None:
            player = Player.objects.create(
                source=source,
                slug=_unique_slug(Player, slugify(row["player"]), taken_slugs),
                name=row["player"],
                club=club,
                date_of_birth=row["date_of_birth"],
                nationality=row["nationality"],
                position=row["position"],
                secondary_positions=row["secondary_positions"],
                preferred_foot=row["preferred_foot"],
            )
            players[player_key] = player

        _, created = PlayerSeason.objects.update_or_create(
            player=player,
            season=row["season"],
            competition=row["competition"],
            defaults={
                "club": club,
                "appearances": row["appearances"],
                "minutes": row["minutes"],
                "metrics": row["metrics"],
            },
        )
        seasons += int(created)

    return ImportResult(clubs=len(clubs), players=len(players), seasons=seasons)
