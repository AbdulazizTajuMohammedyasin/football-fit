"""League-level analysis: club needs and recommendation shortlists.

Pure functions over `PlayerSample` lists. A `LeagueContext` holds every
player-season in one data source and season, so benchmarks, needs and
shortlists are always computed against the same, consistent pool.
"""

from dataclasses import dataclass, field
from functools import cached_property

from football.positions import POSITION_ORDER, Position

from .roles import RoleProfile, roles_for
from .scoring import (
    RELIABLE_COVERAGE,
    Benchmarks,
    FitScore,
    MinuteThresholds,
    PlayerSample,
    RoleScore,
    best_position_score,
    build_benchmarks,
    fit_score,
    minute_thresholds,
    score_role,
)

# Players a club typically uses per position across a league season. Depth counts players
# who have actually played league minutes, so unused squad members do not hide a need.
TARGET_DEPTH = {"GK": 1, "CB": 4, "FB": 4, "DM": 2, "CM": 3, "AM": 2, "W": 3, "ST": 3}
# A role is offered for a league only when this share of its weight has benchmark data.
ROLE_AVAILABLE_COVERAGE = 0.5
AGEING_THRESHOLD = 31
NEED_WEIGHTS = {"quality_gap": 0.45, "depth_gap": 0.35, "ageing": 0.20}
NEED_LEVELS = ((60.0, "high"), (35.0, "medium"), (0.0, "low"))


@dataclass
class LeagueContext:
    samples: list[PlayerSample]

    @cached_property
    def thresholds(self) -> MinuteThresholds:
        return minute_thresholds(max((s.minutes or 0 for s in self.samples), default=0))

    @property
    def min_minutes(self) -> int:
        return self.thresholds.benchmark

    @cached_property
    def positions(self) -> list[str]:
        """Positions used by this league's data, in display order."""
        present = {s.position for s in self.samples}
        return [pos for pos in POSITION_ORDER if pos in present]

    @cached_property
    def benchmarks(self) -> dict[str, Benchmarks]:
        return {
            pos: build_benchmarks(self.samples, pos, self.min_minutes) for pos in POSITION_ORDER
        }

    def available_roles(self, position: str) -> list[RoleProfile]:
        """Role profiles for `position` that this league's metrics can actually support."""
        benchmarks = self.benchmarks[position]
        return [
            role
            for role in roles_for(position)
            if sum(w for key, w in role.weights if key in benchmarks)
            >= ROLE_AVAILABLE_COVERAGE * role.total_weight
        ]

    @cached_property
    def club_ids(self) -> list[int]:
        return sorted({s.club_id for s in self.samples if s.club_id is not None})

    def by_club(self, club_id: int) -> list[PlayerSample]:
        return [s for s in self.samples if s.club_id == club_id]

    def best_score(self, sample: PlayerSample) -> RoleScore | None:
        return best_position_score(sample, self.benchmarks[sample.position])

    def club_best_in_position(self, club_id: int, position: str) -> float | None:
        """Best position score among the club's established players in `position`."""
        scores = [
            result.score
            for s in self.by_club(club_id)
            if s.position == position and (s.minutes or 0) >= self.min_minutes
            if (result := self.best_score(s)) is not None
        ]
        return max(scores) if scores else None

    def club_best_in_role(self, club_id: int, role: RoleProfile) -> float | None:
        scores = [
            result.score
            for s in self.by_club(club_id)
            if s.position == role.position and (s.minutes or 0) >= self.min_minutes
            if (result := score_role(s.metrics, role, self.benchmarks[role.position])).score
            is not None
            and result.coverage >= 0.5
        ]
        return max(scores) if scores else None


@dataclass
class NeedComponent:
    key: str
    label: str
    weight: float
    value: float | None


@dataclass
class PositionNeed:
    position: str
    label: str
    score: float | None
    level: str
    components: list[NeedComponent]
    evidence: list[str]
    squad_count: int
    cover_count: int
    target_depth: int
    best_score: float | None
    league_rank: int | None
    clubs_ranked: int
    ageing_share: float | None
    roles: list[str] = field(default_factory=list)


def _need_level(score: float | None) -> str:
    if score is None:
        return "unknown"
    return next(level for threshold, level in NEED_LEVELS if score >= threshold)


def _ordinal(n: int) -> str:
    suffix = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def position_need(context: LeagueContext, club_id: int, position: str) -> PositionNeed:
    label = Position(position).label
    club = context.by_club(club_id)
    squad = [s for s in club if s.position == position]
    played = [s for s in squad if (s.minutes or 0) > 0]
    cover = [
        s
        for s in club
        if s.position != position and position in s.secondary_positions and (s.minutes or 0) > 0
    ]
    target = TARGET_DEPTH[position]
    evidence: list[str] = []

    # Depth: players who have played count fully, players who can cover count half.
    effective = len(played) + 0.5 * len(cover)
    depth_gap = round(min(max((target - effective) / target, 0.0), 1.0) * 100, 1)
    cover_text = f" plus {len(cover)} who can cover" if cover else ""
    unused = len(squad) - len(played)
    unused_text = f" ({unused} more listed without league minutes)" if unused else ""
    evidence.append(
        f"{len(played)} {label.lower()}(s) have played league minutes{unused_text}{cover_text}; "
        f"clubs typically use {target}."
    )

    # Ageing: share of the position's minutes played by players aged 31+.
    aged_minutes = known_minutes = 0
    unknown_age = 0
    for s in squad:
        if s.minutes is None:
            continue
        if s.age is None:
            unknown_age += 1
            continue
        known_minutes += s.minutes
        if s.age >= AGEING_THRESHOLD:
            aged_minutes += s.minutes
    ageing = round(100 * aged_minutes / known_minutes, 1) if known_minutes else None
    if ageing is not None:
        evidence.append(
            f"{ageing:.0f}% of minutes in this position went to players aged "
            f"{AGEING_THRESHOLD} or older."
        )
    if unknown_age:
        evidence.append(f"{unknown_age} player(s) excluded from the age check: no birth date.")

    # Quality: where the club's best established player ranks against other clubs' best.
    league_best = {
        cid: best
        for cid in context.club_ids
        if (best := context.club_best_in_position(cid, position)) is not None
    }
    club_best = league_best.get(club_id)
    ranked = sorted(league_best.values(), reverse=True)
    rank = None
    if club_best is None:
        quality_gap = 100.0
        evidence.append(
            f"No {label.lower()} with {context.min_minutes}+ minutes and enough data to score."
        )
    else:
        rank = ranked.index(club_best) + 1
        quality_gap = round(100 * (rank - 1) / (len(ranked) - 1), 1) if len(ranked) > 1 else 0.0
        evidence.append(
            f"Best established {label.lower()} scores {club_best:.1f}, "
            f"{_ordinal(rank)} of {len(ranked)} clubs."
        )

    components = [
        NeedComponent("quality_gap", "Quality gap", NEED_WEIGHTS["quality_gap"], quality_gap),
        NeedComponent("depth_gap", "Depth gap", NEED_WEIGHTS["depth_gap"], depth_gap),
        NeedComponent("ageing", "Ageing minutes", NEED_WEIGHTS["ageing"], ageing),
    ]
    available = [c for c in components if c.value is not None]
    total = sum(c.weight for c in available)
    score = round(sum(c.weight * c.value for c in available) / total, 1) if total else None

    return PositionNeed(
        position=position,
        label=label,
        score=score,
        level=_need_level(score),
        components=components,
        evidence=evidence,
        squad_count=len(played),
        cover_count=len(cover),
        target_depth=target,
        best_score=club_best,
        league_rank=rank,
        clubs_ranked=len(ranked),
        ageing_share=ageing,
        roles=[role.key for role in context.available_roles(position)],
    )


def club_needs(context: LeagueContext, club_id: int) -> list[PositionNeed]:
    needs = [position_need(context, club_id, position) for position in context.positions]
    return sorted(
        needs,
        key=lambda n: (-(n.score if n.score is not None else -1), POSITION_ORDER.index(n.position)),
    )


@dataclass(frozen=True)
class ShortlistFilters:
    max_age: int | None = None
    min_age: int | None = None
    # None means the league's benchmark threshold.
    min_minutes: int | None = None
    include_low_coverage: bool = False
    include_secondary: bool = False
    limit: int = 20


@dataclass
class Recommendation:
    sample: PlayerSample
    role_score: RoleScore
    fit: FitScore
    plays_secondary: bool

    @property
    def low_coverage(self) -> bool:
        return self.role_score.coverage < RELIABLE_COVERAGE


@dataclass
class Shortlist:
    role: RoleProfile
    incumbent_best: float | None
    results: list[Recommendation]
    considered: int
    excluded_low_coverage: int


def shortlist(
    context: LeagueContext, club_id: int, role: RoleProfile, filters: ShortlistFilters
) -> Shortlist:
    benchmarks = context.benchmarks[role.position]
    incumbent = context.club_best_in_role(club_id, role)
    min_minutes = context.min_minutes if filters.min_minutes is None else filters.min_minutes
    results: list[Recommendation] = []
    considered = excluded_low_coverage = 0

    for s in context.samples:
        if s.club_id == club_id:
            continue
        plays_secondary = s.position != role.position
        if plays_secondary and not (
            filters.include_secondary and role.position in s.secondary_positions
        ):
            continue
        if (s.minutes or 0) < min_minutes:
            continue
        if filters.max_age is not None and (s.age is None or s.age > filters.max_age):
            continue
        if filters.min_age is not None and (s.age is None or s.age < filters.min_age):
            continue
        considered += 1

        role_result = score_role(s.metrics, role, benchmarks)
        if role_result.score is None:
            excluded_low_coverage += 1
            continue
        if role_result.coverage < RELIABLE_COVERAGE and not filters.include_low_coverage:
            excluded_low_coverage += 1
            continue
        results.append(
            Recommendation(
                sample=s,
                role_score=role_result,
                fit=fit_score(
                    role_result, s.minutes, incumbent, context.thresholds.full_reliability
                ),
                plays_secondary=plays_secondary,
            )
        )

    results.sort(key=lambda r: (-r.fit.score, -r.role_score.coverage, r.sample.name))
    return Shortlist(
        role=role,
        incumbent_best=incumbent,
        results=results[: filters.limit],
        considered=considered,
        excluded_low_coverage=excluded_low_coverage,
    )
