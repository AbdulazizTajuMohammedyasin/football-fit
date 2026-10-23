"""Catalogue of player metrics Football Fit understands.

Every metric stored on a `PlayerSeason` must be listed here. Values are either
per-90-minute rates or percentages. A metric that is absent from a season's
`metrics` is *missing* and must never be treated as zero.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Metric:
    key: str
    label: str
    unit: str  # "per90" or "pct"
    higher_is_better: bool
    description: str


METRICS: tuple[Metric, ...] = (
    # Attacking output
    Metric("np_goals_p90", "Non-penalty goals", "per90", True, "Non-penalty goals per 90."),
    Metric("np_xg_p90", "Non-penalty xG", "per90", True, "Non-penalty expected goals per 90."),
    Metric("shots_p90", "Shots", "per90", True, "Shot attempts per 90."),
    Metric("shots_on_target_pct", "Shots on target %", "pct", True, "Share of shots on target."),
    Metric(
        "touches_in_box_p90",
        "Touches in box",
        "per90",
        True,
        "Touches in the opposition box per 90.",
    ),
    # Creation and progression
    Metric("assists_p90", "Assists", "per90", True, "Assists per 90."),
    Metric("xa_p90", "Expected assists", "per90", True, "Expected assists (xA) per 90."),
    Metric(
        "key_passes_p90", "Key passes", "per90", True, "Passes leading directly to a shot per 90."
    ),
    Metric(
        "progressive_passes_p90",
        "Progressive passes",
        "per90",
        True,
        "Passes moving the ball substantially towards goal per 90.",
    ),
    Metric(
        "progressive_carries_p90",
        "Progressive carries",
        "per90",
        True,
        "Carries moving the ball substantially towards goal per 90.",
    ),
    Metric(
        "successful_take_ons_p90",
        "Successful take-ons",
        "per90",
        True,
        "Dribbles past an opponent per 90.",
    ),
    Metric(
        "crosses_completed_p90",
        "Completed crosses",
        "per90",
        True,
        "Completed crosses into the box per 90.",
    ),
    # Passing security
    Metric(
        "pass_completion_pct",
        "Pass completion %",
        "pct",
        True,
        "Share of attempted passes completed.",
    ),
    Metric(
        "long_pass_completion_pct",
        "Long pass completion %",
        "pct",
        True,
        "Share of long passes completed.",
    ),
    Metric(
        "dispossessed_p90",
        "Times dispossessed",
        "per90",
        False,
        "Times losing the ball to a tackle per 90 (lower is better).",
    ),
    # Defending
    Metric("tackles_won_p90", "Tackles won", "per90", True, "Tackles won per 90."),
    Metric("interceptions_p90", "Interceptions", "per90", True, "Interceptions per 90."),
    Metric("blocks_p90", "Blocks", "per90", True, "Shots and passes blocked per 90."),
    Metric("clearances_p90", "Clearances", "per90", True, "Clearances per 90."),
    Metric(
        "ball_recoveries_p90", "Ball recoveries", "per90", True, "Loose balls recovered per 90."
    ),
    Metric("aerial_duels_won_pct", "Aerial duels won %", "pct", True, "Share of aerial duels won."),
    Metric(
        "dribbled_past_p90",
        "Dribbled past",
        "per90",
        False,
        "Times dribbled past per 90 (lower is better).",
    ),
    # Goalkeeping
    Metric("save_pct", "Save %", "pct", True, "Share of shots on target saved."),
    Metric(
        "goals_prevented_p90",
        "Goals prevented",
        "per90",
        True,
        "Post-shot xG faced minus goals conceded, per 90.",
    ),
    Metric(
        "crosses_stopped_pct",
        "Crosses stopped %",
        "pct",
        True,
        "Share of crosses into the box claimed or punched.",
    ),
    Metric(
        "sweeper_actions_p90",
        "Sweeper actions",
        "per90",
        True,
        "Defensive actions outside the penalty area per 90.",
    ),
    # Season totals published by Fantasy Premier League, converted to per-90 rates or derived
    # shares. These differ from the definitions above (e.g. goals include penalties), so they
    # are kept as separate metrics rather than mixed into the same benchmarks.
    Metric("goals_p90", "Goals", "per90", True, "Goals per 90, including penalties."),
    Metric("xg_p90", "Expected goals (xG)", "per90", True, "Expected goals per 90."),
    Metric("tackles_p90", "Tackles", "per90", True, "Tackles per 90."),
    Metric(
        "cbi_p90",
        "Clearances, blocks & interceptions",
        "per90",
        True,
        "Clearances, blocks and interceptions combined, per 90.",
    ),
    Metric("saves_p90", "Saves", "per90", True, "Saves per 90."),
    Metric(
        "save_share_pct",
        "Save share %",
        "pct",
        True,
        "Derived: saves divided by (saves + goals conceded).",
    ),
    Metric(
        "goals_conceded_p90",
        "Goals conceded",
        "per90",
        False,
        "Team goals conceded while the player was on the pitch, per 90 (lower is better).",
    ),
    Metric(
        "xgc_p90",
        "Expected goals conceded",
        "per90",
        False,
        "Team expected goals conceded while the player was on the pitch, per 90 (lower is better).",
    ),
    Metric(
        "clean_sheets_p90",
        "Clean sheets",
        "per90",
        True,
        "Clean sheets per 90 (team result while the player was on the pitch).",
    ),
)

METRICS_BY_KEY: dict[str, Metric] = {metric.key: metric for metric in METRICS}


class MetricValidationError(ValueError):
    pass


def validate_metrics(values: dict) -> dict[str, float]:
    """Return a cleaned copy of `values`, raising on unknown keys or invalid numbers.

    `None` and empty strings are dropped so they stay missing rather than becoming zero.
    """
    if not isinstance(values, dict):
        raise MetricValidationError("metrics must be an object")
    cleaned: dict[str, float] = {}
    for key, raw in values.items():
        metric = METRICS_BY_KEY.get(key)
        if metric is None:
            raise MetricValidationError(f"unknown metric '{key}'")
        if raw is None or (isinstance(raw, str) and raw.strip() == ""):
            continue
        if isinstance(raw, bool):
            raise MetricValidationError(f"metric '{key}' must be a number")
        try:
            value = float(raw)
        except (TypeError, ValueError) as exc:
            raise MetricValidationError(f"metric '{key}' must be a number") from exc
        if value != value or value in (float("inf"), float("-inf")):
            raise MetricValidationError(f"metric '{key}' must be finite")
        if metric.unit == "pct" and not 0 <= value <= 100:
            raise MetricValidationError(f"metric '{key}' must be between 0 and 100")
        if metric.unit == "per90" and value < 0 and key != "goals_prevented_p90":
            raise MetricValidationError(f"metric '{key}' cannot be negative")
        cleaned[key] = value
    return cleaned
