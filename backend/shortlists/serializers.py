from rest_framework import serializers

from football.models import Club, Player
from scouting.roles import ROLES_BY_KEY

from .models import SavedShortlist

MAX_SHORTLISTS_PER_USER = 50
MAX_PLAYERS_PER_SHORTLIST = 50


def player_reference(slug: str, players: dict[str, Player]) -> dict:
    player = players.get(slug)
    if player is None:
        return {"slug": slug, "available": False}
    return {
        "slug": slug,
        "available": True,
        "name": player.name,
        "position": player.position,
        "club": player.club.name if player.club else None,
        "is_demo": player.source.is_demo,
    }


class SavedShortlistSerializer(serializers.ModelSerializer):
    entries = serializers.SerializerMethodField()
    club_name = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

    class Meta:
        model = SavedShortlist
        fields = [
            "id",
            "name",
            "club_slug",
            "club_name",
            "role_key",
            "role_name",
            "entries",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_entries(self, obj: SavedShortlist) -> list[dict]:
        entries = list(obj.entries.all())
        players = {
            p.slug: p
            for p in Player.objects.select_related("club", "source").filter(
                slug__in=[e.player_slug for e in entries]
            )
        }
        return [
            {
                "player": player_reference(e.player_slug, players),
                "note": e.note,
                "added_at": e.added_at,
            }
            for e in entries
        ]

    def get_club_name(self, obj: SavedShortlist) -> str | None:
        if not obj.club_slug:
            return None
        club = Club.objects.filter(slug=obj.club_slug).only("name").first()
        return club.name if club else None

    def get_role_name(self, obj: SavedShortlist) -> str | None:
        role = ROLES_BY_KEY.get(obj.role_key)
        return role.name if role else None

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value

    def validate_club_slug(self, value: str) -> str:
        if value and not Club.objects.filter(slug=value).exists():
            raise serializers.ValidationError("Unknown club.")
        return value

    def validate_role_key(self, value: str) -> str:
        if value and value not in ROLES_BY_KEY:
            raise serializers.ValidationError("Unknown role.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        if (
            self.instance is None
            and SavedShortlist.objects.filter(owner=request.user).count() >= MAX_SHORTLISTS_PER_USER
        ):
            raise serializers.ValidationError(
                f"You can keep up to {MAX_SHORTLISTS_PER_USER} shortlists."
            )
        return attrs


class AddPlayerSerializer(serializers.Serializer):
    player_slug = serializers.SlugField(max_length=120)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")

    def validate_player_slug(self, value: str) -> str:
        if not Player.objects.filter(slug=value).exists():
            raise serializers.ValidationError("Unknown player.")
        return value
