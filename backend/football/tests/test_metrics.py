import pytest

from football.metrics import METRICS, METRICS_BY_KEY, MetricValidationError, validate_metrics


def test_catalogue_keys_are_unique():
    assert len(METRICS) == len(METRICS_BY_KEY)


def test_missing_values_are_dropped_not_zeroed():
    cleaned = validate_metrics({"np_xg_p90": "0.31", "xa_p90": None, "shots_p90": ""})
    assert cleaned == {"np_xg_p90": 0.31}


def test_zero_is_kept_as_an_observed_value():
    assert validate_metrics({"np_goals_p90": 0}) == {"np_goals_p90": 0.0}


@pytest.mark.parametrize(
    "values",
    [
        {"made_up_metric": 1},
        {"np_xg_p90": "abc"},
        {"np_xg_p90": True},
        {"pass_completion_pct": 120},
        {"shots_p90": -1},
        {"shots_p90": float("nan")},
    ],
)
def test_invalid_values_raise(values):
    with pytest.raises(MetricValidationError):
        validate_metrics(values)


def test_goals_prevented_may_be_negative():
    assert validate_metrics({"goals_prevented_p90": -0.12}) == {"goals_prevented_p90": -0.12}


def test_metrics_must_be_a_mapping():
    with pytest.raises(MetricValidationError):
        validate_metrics([1, 2])
