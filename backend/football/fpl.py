"""Import current Premier League player data from the Fantasy Premier League public API.

The FPL `bootstrap-static` endpoint returns every listed player with season totals.
Football Fit converts those totals to per-90 rates (and a derived save share) and
stores them as one season of Premier League data. Nothing is estimated: a field that
is absent from the response stays missing, and players with no minutes get no metrics.

The API is unofficial and no published licence was found for it, so the data source
is labelled accordingly and intended for personal, non-commercial analysis.
"""

import json
import urllib.request
from datetime import date
from typing import Any

from .importers import ImportResult, SourceInfo, write_rows
from .metrics import MetricValidationError, validate_metrics

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_SOURCE_SLUG = "fpl"
FPL_COMPETITION = "Premier League"
USER_AGENT = "FootballFit/0.1 (personal non-commercial squad analysis)"

# FPL element types → Football Fit broad positions. Other types (such as the managers
# FPL has listed in some seasons) are not players and are skipped.
FPL_POSITIONS = {1: "GK", 2: "DF", 3: "MF", 4: "FW"}

# Football Fit metric → FPL season-total field, converted to a per-90 rate.
PER_90_FIELDS = {
    "goals_p90": "goals_scored",
    "xg_p90": "expected_goals",
    "assists_p90": "assists",
    "xa_p90": "expected_assists",
    "tackles_p90": "tackles",
    "cbi_p90": "clearances_blocks_interceptions",
    "ball_recoveries_p90": "recoveries",
    "goals_conceded_p90": "goals_conceded",
    "xgc_p90": "expected_goals_conceded",
    "clean_sheets_p90": "clean_sheets",
}
GOALKEEPER_PER_90_FIELDS = {"saves_p90": "saves"}

SOURCE_LICENCE = (
    "No published licence was found for the Fantasy Premier League public API (checked "
    "2026-10-24). Used here for personal, non-commercial analysis; check the Premier "
    "League's terms before any public or commercial use."
)
SOURCE_NOTES = (
    "Season totals from the FPL bootstrap-static endpoint. Football Fit derives per-90 "
    "rates and save share from those totals. FPL lists broad positions only "
    "(goalkeeper, defender, midfielder, forward); nationality and preferred foot are not "
    "provided."
)


class FplImportError(ValueError):
    pass


def fetch_bootstrap(url: str = FPL_BOOTSTRAP_URL, timeout: int = 30) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def season_label(data: dict) -> str:
    """'2026-27' style label from the first gameweek's deadline."""
    events = data.get("events") or []
    if not events or not events[0].get("deadline_time"):
        raise FplImportError("response has no gameweek dates to determine the season")
    start_year = int(events[0]["deadline_time"][:4])
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def _number(element: dict, field: str) -> float | None:
    value = element.get(field)
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise FplImportError(f"player {element.get('id')}: '{field}' is not a number") from exc


def player_metrics(element: dict, position: str, minutes: int) -> dict[str, float]:
    """Per-90 metrics for one FPL player; empty when they have not played."""
    if minutes <= 0:
        return {}
    fields = dict(PER_90_FIELDS)
    if position == "GK":
        fields.update(GOALKEEPER_PER_90_FIELDS)

    metrics: dict[str, float] = {}
    for key, field in fields.items():
        total = _number(element, field)
        if total is not None:
            metrics[key] = round(total * 90 / minutes, 2)

    if position == "GK":
        saves = _number(element, "saves")
        conceded = _number(element, "goals_conceded")
        if saves is not None and conceded is not None and saves + conceded > 0:
            metrics["save_share_pct"] = round(100 * saves / (saves + conceded), 1)
    return metrics


def player_rows(data: dict) -> tuple[list[dict[str, Any]], int]:
    """Convert a bootstrap-static response into importer rows. Returns (rows, skipped)."""
    season = season_label(data)
    teams = {team["id"]: team for team in data.get("teams", [])}
    rows: list[dict[str, Any]] = []
    skipped = 0

    for element in data.get("elements", []):
        position = FPL_POSITIONS.get(element.get("element_type"))
        team = teams.get(element.get("team"))
        if position is None or team is None or element.get("removed"):
            skipped += 1
            continue

        name = " ".join(
            part for part in (element.get("first_name"), element.get("second_name")) if part
        ).strip() or element.get("web_name", "")
        if not name:
            skipped += 1
            continue

        minutes_value = _number(element, "minutes")
        minutes = int(minutes_value) if minutes_value is not None else None
        birth = element.get("birth_date")
        try:
            metrics = validate_metrics(player_metrics(element, position, minutes or 0))
            date_of_birth = date.fromisoformat(birth) if birth else None
        except (MetricValidationError, ValueError) as exc:
            raise FplImportError(f"player {element.get('id')} ({name}): {exc}") from exc

        rows.append(
            {
                "club": team["name"],
                "club_short_name": team.get("short_name", ""),
                "player": name,
                "position": position,
                "season": season,
                "competition": FPL_COMPETITION,
                "secondary_positions": [],
                "preferred_foot": "",
                "date_of_birth": date_of_birth,
                "nationality": "",
                "appearances": None,
                "minutes": minutes,
                "metrics": metrics,
            }
        )
    if not rows:
        raise FplImportError("response contained no players")
    return rows, skipped


def import_bootstrap(data: dict, as_of: date) -> tuple[ImportResult, int, str]:
    rows, skipped = player_rows(data)
    info = SourceInfo(
        slug=FPL_SOURCE_SLUG,
        name="Fantasy Premier League (unofficial public API)",
        as_of=as_of,
        licence=SOURCE_LICENCE,
        url="https://fantasy.premierleague.com/",
        notes=SOURCE_NOTES,
        is_demo=False,
    )
    return write_rows(rows, info), skipped, rows[0]["season"]
