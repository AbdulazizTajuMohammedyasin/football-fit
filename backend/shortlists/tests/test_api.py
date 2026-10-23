from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from football.models import Club, DataSource, Player
from shortlists.models import SavedPlayer, SavedShortlist

pytestmark = pytest.mark.django_db

PASSWORD = "a-strong-test-passphrase-91"


@pytest.fixture
def data():
    source = DataSource.objects.create(slug="src", name="Source", as_of=date(2026, 10, 24))
    club = Club.objects.create(source=source, slug="arsenal", name="Arsenal")
    Player.objects.create(source=source, slug="p-one", name="Player One", club=club, position="FW")
    Player.objects.create(source=source, slug="p-two", name="Player Two", club=club, position="MF")
    return club


def make_user(username="fan"):
    return get_user_model().objects.create_user(
        username=username, email=f"{username}@example.com", password=PASSWORD
    )


def authed(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_register_login_and_me_flow():
    client = APIClient()
    response = client.post(
        "/api/auth/users/",
        {"username": "newfan", "email": "newfan@example.com", "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 201
    assert "password" not in response.json()

    tokens = client.post(
        "/api/auth/jwt/create/", {"username": "newfan", "password": PASSWORD}, format="json"
    ).json()
    assert {"access", "refresh"} <= set(tokens)

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    me = client.get("/api/auth/users/me/").json()
    assert me["username"] == "newfan"

    refreshed = client.post("/api/auth/jwt/refresh/", {"refresh": tokens["refresh"]}, format="json")
    assert refreshed.status_code == 200 and "access" in refreshed.json()


def test_registration_rejects_weak_passwords():
    response = APIClient().post(
        "/api/auth/users/",
        {"username": "weak", "email": "weak@example.com", "password": "123"},
        format="json",
    )
    assert response.status_code == 400
    assert "password" in response.json()


def test_bad_credentials_are_rejected():
    make_user()
    response = APIClient().post(
        "/api/auth/jwt/create/", {"username": "fan", "password": "wrong"}, format="json"
    )
    assert response.status_code == 401


def test_shortlists_require_authentication():
    assert APIClient().get("/api/me/shortlists/").status_code == 401


def test_public_scouting_endpoints_stay_anonymous(data):
    assert APIClient().get("/api/clubs/").status_code == 200


def test_create_add_and_remove_players(data):
    client = authed(make_user())
    created = client.post(
        "/api/me/shortlists/",
        {"name": "  Summer targets ", "club_slug": "arsenal", "role_key": "fw-finisher"},
        format="json",
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Summer targets"
    assert body["club_name"] == "Arsenal" and body["role_name"] == "Finisher"

    url = f"/api/me/shortlists/{body['id']}/players/"
    added = client.post(url, {"player_slug": "p-one", "note": "Strong xG"}, format="json")
    assert added.status_code == 201
    entry = added.json()["entries"][0]
    assert entry["player"]["name"] == "Player One" and entry["note"] == "Strong xG"

    duplicate = client.post(url, {"player_slug": "p-one"}, format="json")
    assert duplicate.status_code == 400

    unknown = client.post(url, {"player_slug": "nobody"}, format="json")
    assert unknown.status_code == 400

    assert client.delete(f"{url}p-one/").status_code == 204
    assert client.delete(f"{url}p-one/").status_code == 404
    assert client.get(f"/api/me/shortlists/{body['id']}/").json()["entries"] == []


@pytest.mark.parametrize(
    "payload",
    [{"name": ""}, {"name": "x", "club_slug": "nowhere"}, {"name": "x", "role_key": "made-up"}],
)
def test_invalid_shortlists_are_rejected(data, payload):
    response = authed(make_user()).post("/api/me/shortlists/", payload, format="json")
    assert response.status_code == 400


def test_users_cannot_see_or_change_other_users_lists(data):
    owner, other = make_user("owner"), make_user("other")
    shortlist = SavedShortlist.objects.create(owner=owner, name="Private")
    client = authed(other)
    assert client.get("/api/me/shortlists/").json() == []
    assert client.get(f"/api/me/shortlists/{shortlist.id}/").status_code == 404
    assert (
        client.patch(
            f"/api/me/shortlists/{shortlist.id}/", {"name": "Hijacked"}, format="json"
        ).status_code
        == 404
    )
    assert client.delete(f"/api/me/shortlists/{shortlist.id}/").status_code == 404
    shortlist.refresh_from_db()
    assert shortlist.name == "Private"


def test_entries_survive_a_data_reimport_and_are_flagged_unavailable(data):
    user = make_user()
    shortlist = SavedShortlist.objects.create(owner=user, name="List", club_slug="arsenal")
    SavedPlayer.objects.create(shortlist=shortlist, player_slug="p-two")
    DataSource.objects.filter(slug="src").delete()  # what a re-import does first

    body = authed(user).get(f"/api/me/shortlists/{shortlist.id}/").json()
    assert body["entries"][0]["player"] == {"slug": "p-two", "available": False}
    assert body["club_name"] is None


def test_rename_and_delete(data):
    user = make_user()
    client = authed(user)
    shortlist = SavedShortlist.objects.create(owner=user, name="Old")
    renamed = client.patch(f"/api/me/shortlists/{shortlist.id}/", {"name": "New"}, format="json")
    assert renamed.json()["name"] == "New"
    assert client.delete(f"/api/me/shortlists/{shortlist.id}/").status_code == 204
    assert not SavedShortlist.objects.exists()
