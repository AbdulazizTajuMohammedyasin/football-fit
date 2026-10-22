"""Deterministic, explainable scoring.

All functions here are pure: they take plain data and return plain data, so
they can be unit-tested without a database. No figure is ever inferred: a
missing metric is reported as missing and excluded from the weighted mean
(its weight lowers the coverage figure instead of counting as zero).
"""

from bisect import bisect_left, bisect_right
from collections.abc import Iterable
from dataclasses import dataclass, field

from football.metrics import METRICS_BY_KEY

from .roles import RoleProfile, roles_for

# Players need this many minutes to join the benchmark pool percentiles are computed against.
BENCHMARK_MIN_MINUTES = 900
# Below this share of profile weight, a role score is flagged as low-coverage.
RELIABLE_COVERAGE = 0.7
# Minutes at which the reliability component reaches 100.
FULL_RELIABILITY_MINUTES = 2500

FIT_WEIGHTS = {"role_quality": 0.60, "upgrade": 0.25, "reliability": 0.15}


@dataclass(frozen=True)
class PlayerSample:
    """The observed data the engine needs about one player-season."""

    id: int
    slug: str
    name: str
    position: str
    club_id: int | None
    minutes: int | None
    metrics: dict[str, float]
    age: int | None = None
    secondary_positions: tuple[str, ...] = ()


@dataclass
class MetricComponent:
    key: str
    label: str
    weight: float
    value: float | None
    percentile: float | None
    higher_is_better: bool

    @property
    def missing(self) -> bool:
        return self.value is None


@dataclass
class RoleScore:
    role: RoleProfile
    score: float | None
    coverage: float
    components: list[MetricComponent] = field(default_factory=list)

    @property
    def reliable(self) -> bool:
        return self.score is not None and self.coverage >= RELIABLE_COVERAGE


Benchmarks = dict[str, list[float]]


def build_benchmarks(pool: Iterable[PlayerSample], position: str) -> Benchmarks:
    """Sorted metric values for players in `position` with enough minutes."""
    values: dict[str, list[float]] = {}
    for sample in pool:
        if sample.position != position or (sample.minutes or 0) < BENCHMARK_MIN_MINUTES:
            continue
        for key, value in sample.metrics.items():
            values.setdefault(key, []).append(value)
    return {key: sorted(items) for key, items in values.items()}


def percentile_rank(value: float, sorted_values: list[float], higher_is_better: bool) -> float:
    """Mid-rank percentile (0-100) of `value` within `sorted_values`.

    For lower-is-better metrics the scale is flipped, so 100 is always best.
    """
    if not sorted_values:
        raise ValueError("cannot rank against an empty benchmark")
    below = bisect_left(sorted_values, value)
    equal = bisect_right(sorted_values, value) - below
    above = len(sorted_values) - below - equal
    better_than = below if higher_is_better else above
    return round(100 * (better_than + 0.5 * equal) / len(sorted_values), 1)


def score_role(metrics: dict[str, float], role: RoleProfile, benchmarks: Benchmarks) -> RoleScore:
    components: list[MetricComponent] = []
    weighted_sum = 0.0
    available_weight = 0.0
    for key, weight in role.weights:
        metric = METRICS_BY_KEY[key]
        value = metrics.get(key)
        pool = benchmarks.get(key)
        percentile = None
        if value is not None and pool:
            percentile = percentile_rank(value, pool, metric.higher_is_better)
            weighted_sum += weight * percentile
            available_weight += weight
        components.append(
            MetricComponent(
                key=key,
                label=metric.label,
                weight=weight,
                value=value,
                percentile=percentile,
                higher_is_better=metric.higher_is_better,
            )
        )
    coverage = round(available_weight / role.total_weight, 3)
    score = round(weighted_sum / available_weight, 1) if available_weight else None
    return RoleScore(role=role, score=score, coverage=coverage, components=components)


def best_position_score(
    sample: PlayerSample, benchmarks: Benchmarks, min_coverage: float = 0.5
) -> RoleScore | None:
    """The player's highest role score among the profiles for their position."""
    scores = [score_role(sample.metrics, role, benchmarks) for role in roles_for(sample.position)]
    usable = [s for s in scores if s.score is not None and s.coverage >= min_coverage]
    if not usable:
        return None
    return max(usable, key=lambda s: (s.score, s.coverage))


def reliability(minutes: int | None) -> float | None:
    if minutes is None:
        return None
    return round(min(minutes / FULL_RELIABILITY_MINUTES, 1.0) * 100, 1)


@dataclass
class FitComponent:
    key: str
    label: str
    weight: float
    value: float | None
    explanation: str


@dataclass
class FitScore:
    score: float | None
    components: list[FitComponent]


def fit_score(
    role_score: RoleScore,
    candidate_minutes: int | None,
    incumbent_best: float | None,
) -> FitScore:
    """Blend role quality, upgrade over the club's best incumbent, and minutes reliability.

    Components with no data are excluded and the remaining weights renormalised.
    The result ranks candidates; it is not a probability of a successful transfer.
    """
    components: list[FitComponent] = []

    quality = role_score.score
    components.append(
        FitComponent(
            "role_quality",
            "Role quality",
            FIT_WEIGHTS["role_quality"],
            quality,
            f"Weighted percentile across {role_score.role.name} metrics "
            f"({round(role_score.coverage * 100)}% of profile weight available).",
        )
    )

    if quality is None:
        upgrade, upgrade_text = None, "Not available without a role score."
    elif incumbent_best is None:
        upgrade = 100.0
        upgrade_text = "The club has no current player with a usable score in this position."
    else:
        delta = quality - incumbent_best
        upgrade = round(min(max(50 + delta, 0.0), 100.0), 1)
        direction = "above" if delta >= 0 else "below"
        upgrade_text = (
            f"{abs(delta):.1f} points {direction} the club's best current player "
            f"({incumbent_best:.1f}) in this role; 50 means level."
        )
    components.append(
        FitComponent("upgrade", "Upgrade on squad", FIT_WEIGHTS["upgrade"], upgrade, upgrade_text)
    )

    rel = reliability(candidate_minutes)
    rel_text = (
        "Minutes not recorded."
        if rel is None
        else f"{candidate_minutes} league minutes; {FULL_RELIABILITY_MINUTES}+ counts as fully "
        "established."
    )
    components.append(
        FitComponent("reliability", "Sample reliability", FIT_WEIGHTS["reliability"], rel, rel_text)
    )

    available = [c for c in components if c.value is not None]
    if quality is None or not available:
        return FitScore(score=None, components=components)
    total_weight = sum(c.weight for c in available)
    score = sum(c.weight * c.value for c in available) / total_weight
    return FitScore(score=round(score, 1), components=components)
