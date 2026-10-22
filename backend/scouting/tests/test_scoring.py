import pytest

from football.metrics import METRICS_BY_KEY
from football.positions import POSITION_ORDER
from scouting.roles import ROLES, ROLES_BY_KEY, roles_for
from scouting.scoring import (
    BENCHMARK_MIN_MINUTES,
    PlayerSample,
    best_position_score,
    build_benchmarks,
    fit_score,
    percentile_rank,
    reliability,
    score_role,
)


def sample(id, position="ST", minutes=2000, **metrics):
    return PlayerSample(
        id=id,
        slug=f"p{id}",
        name=f"P{id}",
        position=position,
        club_id=1,
        minutes=minutes,
        metrics=metrics,
    )


def test_every_role_uses_known_metrics_and_weights_sum_to_one():
    for role in ROLES:
        assert role.position in POSITION_ORDER
        assert all(key in METRICS_BY_KEY for key, _ in role.weights)
        assert role.total_weight == pytest.approx(1.0)


def test_every_position_has_a_role_and_profiles_differ_between_positions():
    for position in POSITION_ORDER:
        assert roles_for(position)
    weights = {frozenset(role.weights) for role in ROLES}
    assert len(weights) == len(ROLES)


def test_percentile_rank_uses_mid_rank_and_flips_lower_is_better():
    values = [1.0, 2.0, 3.0, 4.0]
    assert percentile_rank(4.0, values, True) == 87.5
    assert percentile_rank(1.0, values, True) == 12.5
    assert percentile_rank(1.0, values, False) == 87.5
    assert percentile_rank(2.5, values, True) == 50.0


def test_percentile_rank_rejects_empty_benchmark():
    with pytest.raises(ValueError):
        percentile_rank(1.0, [], True)


def test_benchmarks_only_include_same_position_with_enough_minutes():
    pool = [
        sample(1, np_xg_p90=0.5),
        sample(2, minutes=BENCHMARK_MIN_MINUTES - 1, np_xg_p90=0.9),
        sample(3, position="W", np_xg_p90=0.7),
        sample(4, minutes=None, np_xg_p90=0.8),
    ]
    assert build_benchmarks(pool, "ST") == {"np_xg_p90": [0.5]}


def test_missing_metrics_reduce_coverage_instead_of_counting_as_zero():
    role = ROLES_BY_KEY["st-poacher"]
    benchmarks = {
        "np_goals_p90": [0.1, 0.2, 0.3, 0.4],
        "np_xg_p90": [0.1, 0.2, 0.3, 0.4],
        "touches_in_box_p90": [3.0, 4.0, 5.0, 6.0],
        "shots_on_target_pct": [30.0, 35.0, 40.0, 45.0],
    }
    full = score_role(
        {
            "np_goals_p90": 0.4,
            "np_xg_p90": 0.4,
            "touches_in_box_p90": 6.0,
            "shots_on_target_pct": 45.0,
        },
        role,
        benchmarks,
    )
    partial = score_role({"np_goals_p90": 0.4, "np_xg_p90": 0.4}, role, benchmarks)

    assert full.score == 87.5 and full.coverage == 1.0
    assert partial.score == 87.5  # not dragged down by the missing metrics
    assert partial.coverage == 0.6
    assert not partial.reliable
    assert [c.key for c in partial.components if c.missing] == [
        "touches_in_box_p90",
        "shots_on_target_pct",
    ]


def test_score_is_none_when_no_metric_is_available():
    result = score_role({}, ROLES_BY_KEY["st-poacher"], {"np_goals_p90": [0.1]})
    assert result.score is None
    assert result.coverage == 0


def test_best_position_score_picks_highest_role():
    benchmarks = {"np_goals_p90": [0.1, 0.5], "np_xg_p90": [0.1, 0.5], "xa_p90": [0.05, 0.3]}
    player = sample(1, np_goals_p90=0.5, np_xg_p90=0.5, xa_p90=0.05)
    best = best_position_score(player, benchmarks, min_coverage=0.3)
    assert best is not None
    assert best.role.key == "st-poacher"


def test_reliability_caps_and_keeps_missing_minutes_missing():
    assert reliability(None) is None
    assert reliability(1250) == 50.0
    assert reliability(4000) == 100.0


def test_fit_score_blends_components_and_renormalises_missing_minutes():
    role_score = score_role(
        {"np_goals_p90": 0.4},
        ROLES_BY_KEY["st-poacher"],
        {"np_goals_p90": [0.1, 0.2, 0.3, 0.4]},
    )
    assert role_score.score == 87.5

    full = fit_score(role_score, candidate_minutes=2500, incumbent_best=77.5)
    # 0.6 * 87.5 + 0.25 * (50 + 10) + 0.15 * 100
    assert full.score == pytest.approx(82.5)

    no_minutes = fit_score(role_score, candidate_minutes=None, incumbent_best=77.5)
    # (0.6 * 87.5 + 0.25 * 60) / 0.85
    assert no_minutes.score == pytest.approx(79.4, abs=0.05)
    assert no_minutes.components[2].value is None


def test_fit_score_without_incumbent_treats_slot_as_empty():
    role_score = score_role(
        {"np_goals_p90": 0.1}, ROLES_BY_KEY["st-poacher"], {"np_goals_p90": [0.1]}
    )
    result = fit_score(role_score, candidate_minutes=2500, incumbent_best=None)
    assert result.components[1].value == 100.0


def test_fit_score_is_none_without_role_score():
    role_score = score_role({}, ROLES_BY_KEY["st-poacher"], {})
    assert fit_score(role_score, candidate_minutes=3000, incumbent_best=50).score is None
