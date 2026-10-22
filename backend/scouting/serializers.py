"""Response shaping and query-parameter validation for the API."""

from rest_framework import serializers

from football.metrics import METRICS, METRICS_BY_KEY
from football.models import Club, DataSource, Player
from football.positions import Position

from .analysis import PositionNeed, Recommendation, Shortlist
from .data import League
from .roles import ROLES_BY_KEY, RoleProfile
from .scoring import RELIABLE_COVERAGE, FitScore, RoleScore


def source_data(source: DataSource) -> dict:
    return {
        "slug": source.slug,
        "name": source.name,
        "is_demo": source.is_demo,
        "licence": source.licence,
        "url": source.url,
        "notes": source.notes,
        "as_of": source.as_of.isoformat(),
    }


def club_summary(club: Club) -> dict:
    return {
        "slug": club.slug,
        "name": club.name,
        "short_name": club.short_name or club.name,
        "competition": club.competition,
        "is_demo": club.source.is_demo,
    }


def role_data(role: RoleProfile) -> dict:
    return {
        "key": role.key,
        "position": role.position,
        "name": role.name,
        "summary": role.summary,
        "weights": [
            {"metric": key, "label": METRICS_BY_KEY[key].label, "weight": weight}
            for key, weight in role.weights
        ],
    }


def metric_catalogue() -> list[dict]:
    return [
        {
            "key": m.key,
            "label": m.label,
            "unit": m.unit,
            "higher_is_better": m.higher_is_better,
            "description": m.description,
        }
        for m in METRICS
    ]


def role_score_data(result: RoleScore) -> dict:
    return {
        "role": result.role.key,
        "role_name": result.role.name,
        "score": result.score,
        "coverage": result.coverage,
        "reliable": result.reliable,
        "components": [
            {
                "metric": c.key,
                "label": c.label,
                "weight": c.weight,
                "value": c.value,
                "percentile": c.percentile,
                "higher_is_better": c.higher_is_better,
                "missing": c.missing,
            }
            for c in result.components
        ],
    }


def fit_data(fit: FitScore) -> dict:
    return {
        "score": fit.score,
        "components": [
            {
                "key": c.key,
                "label": c.label,
                "weight": c.weight,
                "value": c.value,
                "explanation": c.explanation,
            }
            for c in fit.components
        ],
    }


def player_summary(player: Player, league: League | None) -> dict:
    """Player profile; without a league (no season data) only the profile fields are filled."""
    season = league.seasons.get(player.id) if league else None
    club = season.club if season and season.club_id else player.club
    as_of = league.as_of if league else player.source.as_of
    return {
        "slug": player.slug,
        "name": player.name,
        "position": player.position,
        "position_label": Position(player.position).label,
        "secondary_positions": list(player.secondary_positions or []),
        "age": player.age_on(as_of),
        "nationality": player.nationality or None,
        "preferred_foot": player.preferred_foot or None,
        "club": club_summary(club) if club else None,
        "minutes": season.minutes if season else None,
        "appearances": season.appearances if season else None,
    }


def league_meta(league: League) -> dict:
    return {
        "source": source_data(league.source),
        "competition": league.competition,
        "season": league.season,
        "as_of": league.as_of.isoformat(),
    }


def need_data(need: PositionNeed) -> dict:
    return {
        "position": need.position,
        "label": need.label,
        "score": need.score,
        "level": need.level,
        "components": [
            {"key": c.key, "label": c.label, "weight": c.weight, "value": c.value}
            for c in need.components
        ],
        "evidence": need.evidence,
        "squad_count": need.squad_count,
        "cover_count": need.cover_count,
        "target_depth": need.target_depth,
        "best_score": need.best_score,
        "league_rank": need.league_rank,
        "clubs_ranked": need.clubs_ranked,
        "ageing_share": need.ageing_share,
        "roles": [{"key": key, "name": ROLES_BY_KEY[key].name} for key in need.roles],
    }


def recommendation_data(rec: Recommendation, league: League) -> dict:
    player = league.players[rec.sample.id]
    return {
        "player": player_summary(player, league),
        "fit": fit_data(rec.fit),
        "role_score": role_score_data(rec.role_score),
        "low_coverage": rec.low_coverage,
        "plays_secondary": rec.plays_secondary,
    }


def shortlist_data(result: Shortlist, league: League) -> dict:
    return {
        "role": role_data(result.role),
        "incumbent_best": result.incumbent_best,
        "considered": result.considered,
        "excluded_low_coverage": result.excluded_low_coverage,
        "reliable_coverage": RELIABLE_COVERAGE,
        "results": [recommendation_data(rec, league) for rec in result.results],
    }


class ShortlistQuerySerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=sorted(ROLES_BY_KEY))
    max_age = serializers.IntegerField(required=False, min_value=15, max_value=45)
    min_age = serializers.IntegerField(required=False, min_value=15, max_value=45)
    min_minutes = serializers.IntegerField(required=False, min_value=0, max_value=5000)
    include_low_coverage = serializers.BooleanField(required=False, default=False)
    include_secondary = serializers.BooleanField(required=False, default=False)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50, default=20)

    def validate(self, attrs):
        if (
            attrs.get("max_age") is not None
            and attrs.get("min_age") is not None
            and attrs["min_age"] > attrs["max_age"]
        ):
            raise serializers.ValidationError("min_age cannot be greater than max_age")
        return attrs


class PlayerListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False, max_length=80, allow_blank=True)
    position = serializers.ChoiceField(required=False, choices=Position.values)
    club = serializers.SlugField(required=False)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=50)


class CompareQuerySerializer(serializers.Serializer):
    players = serializers.CharField(max_length=400)
    role = serializers.ChoiceField(required=False, choices=sorted(ROLES_BY_KEY))

    def validate_players(self, value):
        slugs = list(dict.fromkeys(s.strip() for s in value.split(",") if s.strip()))
        if not 2 <= len(slugs) <= 4:
            raise serializers.ValidationError("Choose between 2 and 4 players to compare.")
        return slugs
