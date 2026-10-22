import pytest

from scouting.analysis import (
    TARGET_DEPTH,
    LeagueContext,
    ShortlistFilters,
    club_needs,
    position_need,
    shortlist,
)
from scouting.roles import ROLES_BY_KEY
from scouting.scoring import PlayerSample

POACHER = ROLES_BY_KEY["st-poacher"]


def striker(id, club_id, quality, minutes=2500, age=25, secondary=(), position="ST", **extra):
    metrics = {
        "np_goals_p90": quality,
        "np_xg_p90": quality,
        "touches_in_box_p90": quality * 10,
        "shots_on_target_pct": 30 + quality * 20,
    }
    metrics.update(extra)
    return PlayerSample(
        id=id,
        slug=f"p{id}",
        name=f"Player {id}",
        position=position,
        club_id=club_id,
        minutes=minutes,
        metrics=metrics,
        age=age,
        secondary_positions=tuple(secondary),
    )


@pytest.fixture
def league():
    return LeagueContext(
        samples=[
            striker(1, club_id=1, quality=0.2, age=33),
            striker(2, club_id=2, quality=0.5),
            striker(3, club_id=2, quality=0.3, age=None),
            striker(4, club_id=3, quality=0.4),
            striker(5, club_id=3, quality=0.6, age=21, minutes=1000),
            striker(6, club_id=3, quality=0.9, minutes=300),
        ]
    )


def test_need_reflects_depth_quality_and_ageing(league):
    need = position_need(league, club_id=1, position="ST")
    assert need.squad_count == 1
    assert need.target_depth == TARGET_DEPTH["ST"]
    assert need.league_rank == 3 and need.clubs_ranked == 3
    assert need.ageing_share == 100.0
    components = {c.key: c.value for c in need.components}
    assert components["quality_gap"] == 100.0
    assert components["depth_gap"] == pytest.approx(66.7)
    assert need.level == "high"
    assert any("3rd of 3" in line for line in need.evidence)


def test_unknown_ages_are_reported_not_assumed(league):
    need = position_need(league, club_id=2, position="ST")
    assert any("no birth date" in line for line in need.evidence)
    assert need.ageing_share == 0.0


def test_position_without_players_has_maximum_gaps(league):
    need = position_need(league, club_id=1, position="GK")
    components = {c.key: c.value for c in need.components}
    assert components["depth_gap"] == 100.0
    assert components["quality_gap"] == 100.0
    assert components["ageing"] is None
    assert need.score == 100.0


def test_club_needs_are_sorted_by_score(league):
    scores = [n.score for n in club_needs(league, club_id=2)]
    assert scores == sorted(scores, reverse=True)


def test_shortlist_excludes_own_club_and_low_minutes(league):
    result = shortlist(league, club_id=1, role=POACHER, filters=ShortlistFilters())
    ids = [r.sample.id for r in result.results]
    assert 1 not in ids  # own player
    assert 6 not in ids  # below default minutes threshold
    assert ids[0] == 5  # best role score
    assert result.incumbent_best is not None


def test_shortlist_age_filters_exclude_unknown_ages(league):
    result = shortlist(league, club_id=1, role=POACHER, filters=ShortlistFilters(max_age=24))
    assert [r.sample.id for r in result.results] == [5]


def test_shortlist_low_coverage_is_opt_in():
    samples = [
        striker(1, club_id=1, quality=0.5),
        striker(2, club_id=2, quality=0.6),
        PlayerSample(
            id=3,
            slug="p3",
            name="Sparse",
            position="ST",
            club_id=2,
            minutes=2000,
            metrics={"np_goals_p90": 0.9},
            age=24,
        ),
    ]
    league = LeagueContext(samples)
    default = shortlist(league, 1, POACHER, ShortlistFilters())
    assert [r.sample.id for r in default.results] == [2]
    assert default.excluded_low_coverage == 1

    opted_in = shortlist(league, 1, POACHER, ShortlistFilters(include_low_coverage=True))
    sparse = next(r for r in opted_in.results if r.sample.id == 3)
    assert sparse.low_coverage


def test_shortlist_secondary_position_players_are_opt_in():
    samples = [
        striker(1, club_id=1, quality=0.5),
        striker(2, club_id=2, quality=0.6),
        striker(3, club_id=2, quality=0.4, position="W", secondary=("ST",)),
    ]
    league = LeagueContext(samples)
    assert [r.sample.id for r in shortlist(league, 1, POACHER, ShortlistFilters()).results] == [2]
    with_secondary = shortlist(league, 1, POACHER, ShortlistFilters(include_secondary=True))
    assert {r.sample.id for r in with_secondary.results} == {2, 3}
    assert next(r for r in with_secondary.results if r.sample.id == 3).plays_secondary


def test_shortlist_is_deterministic(league):
    first = shortlist(league, 1, POACHER, ShortlistFilters())
    second = shortlist(league, 1, POACHER, ShortlistFilters())
    assert [r.sample.id for r in first.results] == [r.sample.id for r in second.results]
