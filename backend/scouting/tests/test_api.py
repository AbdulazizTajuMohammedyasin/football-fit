import pytest

from football.demo import build_demo_dataset
from football.models import Club, DataSource, Player, PlayerSeason

pytestmark = pytest.mark.django_db


@pytest.fixture(scope="module")
def demo(django_db_setup, django_db_blocker):
    with django_db_blocker.unblock():
        build_demo_dataset()
    yield
    with django_db_blocker.unblock():
        DataSource.objects.all().delete()


@pytest.fixture
def club(demo):
    return Club.objects.order_by("name").first()


def test_meta_lists_sources_roles_and_scoring_constants(client, demo):
    data = client.get("/api/meta/").json()
    assert data["sources"][0]["is_demo"] is True
    assert {r["position"] for r in data["roles"]} == {p["code"] for p in data["positions"]}
    assert set(data["scoring"]["fit_weights"]) == {"role_quality", "upgrade", "reliability"}


def test_club_list(client, demo):
    data = client.get("/api/clubs/").json()
    assert len(data) == 20
    assert all(c["is_demo"] for c in data)
    assert all(c["squad_size"] > 0 for c in data)


def test_club_detail_includes_season_and_squad(client, club):
    data = client.get(f"/api/clubs/{club.slug}/").json()
    assert data["club"]["slug"] == club.slug
    assert data["source"]["is_demo"] is True
    assert data["season"] == "2025-26"
    assert len(data["squad"]) == club.players.count()


def test_unknown_club_is_404(client, demo):
    assert client.get("/api/clubs/nope/").status_code == 404
    assert client.get("/api/clubs/nope/needs/").status_code == 404


def test_club_needs_cover_every_position_with_evidence(client, club):
    data = client.get(f"/api/clubs/{club.slug}/needs/").json()
    needs = data["needs"]
    assert len(needs) == 8
    scores = [n["score"] for n in needs]
    assert scores == sorted(scores, reverse=True)
    assert all(n["evidence"] for n in needs)
    assert all(n["roles"] for n in needs)


def test_recommendations_require_a_valid_role(client, club):
    assert client.get(f"/api/clubs/{club.slug}/recommendations/").status_code == 400
    response = client.get(f"/api/clubs/{club.slug}/recommendations/?role=made-up")
    assert response.status_code == 400


@pytest.mark.parametrize(
    "query",
    ["max_age=abc", "max_age=10", "limit=0", "limit=500", "min_age=30&max_age=20"],
)
def test_recommendations_reject_invalid_filters(client, club, query):
    url = f"/api/clubs/{club.slug}/recommendations/?role=st-poacher&{query}"
    assert client.get(url).status_code == 400


def test_recommendations_exclude_own_club_and_respect_filters(client, club):
    url = f"/api/clubs/{club.slug}/recommendations/?role=st-poacher&max_age=27&limit=5"
    data = client.get(url).json()
    assert data["role"]["key"] == "st-poacher"
    assert 0 < len(data["results"]) <= 5
    fits = [r["fit"]["score"] for r in data["results"]]
    assert fits == sorted(fits, reverse=True)
    for result in data["results"]:
        assert result["player"]["club"]["slug"] != club.slug
        assert result["player"]["age"] <= 27
        assert result["player"]["minutes"] >= 900
        assert result["role_score"]["coverage"] >= 0.7
        assert {c["key"] for c in result["fit"]["components"]} == {
            "role_quality",
            "upgrade",
            "reliability",
        }


def test_player_detail_marks_missing_metrics(client, demo):
    season = next(
        row
        for row in PlayerSeason.objects.select_related("player")
        if row.minutes and row.player.position != "GK" and len(row.metrics) < 22
    )
    data = client.get(f"/api/players/{season.player.slug}/").json()
    missing = [m for m in data["metrics"] if m["missing"]]
    assert missing
    assert all(m["value"] is None and m["percentile"] is None for m in missing)
    assert data["data_coverage"] < 1
    assert data["role_scores"]


def test_player_without_season_returns_empty_evidence(client, demo):
    source = DataSource.objects.get(slug="demo")
    Player.objects.create(source=source, slug="no-season", name="No Season", position="CB")
    data = client.get("/api/players/no-season/").json()
    assert data["season"] is None
    assert data["metrics"] == []
    assert data["player"]["minutes"] is None
    assert data["source"]["is_demo"] is True


def test_player_search(client, demo):
    player = Player.objects.order_by("name").first()
    data = client.get(f"/api/players/?search={player.name[:4]}&limit=100").json()
    assert player.slug in [p["slug"] for p in data]
    assert client.get("/api/players/?position=XX").status_code == 400


def test_compare_players_on_shared_role(client, demo):
    strikers = list(Player.objects.filter(position="ST").values_list("slug", flat=True)[:3])
    data = client.get(f"/api/compare/?players={','.join(strikers)}&role=st-complete").json()
    assert data["role"]["key"] == "st-complete"
    assert [p["player"]["slug"] for p in data["players"]] == strikers


def test_compare_validation(client, demo):
    one = Player.objects.first().slug
    assert client.get(f"/api/compare/?players={one}").status_code == 400
    assert client.get(f"/api/compare/?players={one},missing-player").status_code == 404
