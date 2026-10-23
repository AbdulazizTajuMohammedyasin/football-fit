from itertools import islice

from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from football.metrics import METRICS_BY_KEY
from football.models import Club, DataSource, Player
from football.positions import POSITION_ORDER, Position

from . import serializers as s
from .analysis import (
    AGEING_THRESHOLD,
    NEED_WEIGHTS,
    TARGET_DEPTH,
    ShortlistFilters,
    club_needs,
    shortlist,
)
from .data import league_for_club, league_for_player
from .roles import ROLES, ROLES_BY_KEY, roles_for
from .scoring import (
    BENCHMARK_MIN_MINUTES,
    FIT_WEIGHTS,
    FULL_RELIABILITY_MINUTES,
    RELIABLE_COVERAGE,
    percentile_rank,
    score_role,
)


def _validated(serializer_class, request):
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
def meta(request):
    return Response(
        {
            "sources": [s.source_data(source) for source in DataSource.objects.all()],
            "positions": [
                {"code": code, "label": Position(code).label, "target_depth": TARGET_DEPTH[code]}
                for code in POSITION_ORDER
            ],
            "metrics": s.metric_catalogue(),
            "roles": [s.role_data(role) for role in ROLES],
            "scoring": {
                "benchmark_min_minutes": BENCHMARK_MIN_MINUTES,
                "reliable_coverage": RELIABLE_COVERAGE,
                "full_reliability_minutes": FULL_RELIABILITY_MINUTES,
                "fit_weights": FIT_WEIGHTS,
                "need_weights": NEED_WEIGHTS,
                "ageing_threshold": AGEING_THRESHOLD,
            },
        }
    )


@api_view(["GET"])
def club_list(request):
    clubs = Club.objects.select_related("source").annotate(squad_size=Count("players"))
    return Response([{**s.club_summary(club), "squad_size": club.squad_size} for club in clubs])


def _get_club(slug: str) -> Club:
    return get_object_or_404(Club.objects.select_related("source"), slug=slug)


@api_view(["GET"])
def club_detail(request, slug):
    club = _get_club(slug)
    league = league_for_club(club)
    squad = []
    for sample in league.context.by_club(club.id):
        best = league.context.best_score(sample)
        squad.append(
            {
                **s.player_summary(league.players[sample.id], league),
                "best_role": None
                if best is None
                else {
                    "key": best.role.key,
                    "name": best.role.name,
                    "score": best.score,
                    "coverage": best.coverage,
                },
            }
        )
    squad.sort(key=lambda p: (POSITION_ORDER.index(p["position"]), -(p["minutes"] or 0)))
    return Response({"club": s.club_summary(club), **s.league_meta(league), "squad": squad})


@api_view(["GET"])
def club_needs_view(request, slug):
    club = _get_club(slug)
    league = league_for_club(club)
    if not league.context.by_club(club.id):
        return Response(
            {
                "club": s.club_summary(club),
                **s.league_meta(league),
                "needs": [],
                "detail": "No season data is available for this club.",
            }
        )
    needs = club_needs(league.context, club.id)
    return Response(
        {
            "club": s.club_summary(club),
            **s.league_meta(league),
            "needs": [s.need_data(need) for need in needs],
        }
    )


@api_view(["GET"])
def club_recommendations(request, slug):
    club = _get_club(slug)
    params = _validated(s.ShortlistQuerySerializer, request)
    filters = ShortlistFilters(
        max_age=params.get("max_age"),
        min_age=params.get("min_age"),
        min_minutes=params.get("min_minutes", BENCHMARK_MIN_MINUTES),
        include_low_coverage=params["include_low_coverage"],
        include_secondary=params["include_secondary"],
        limit=params["limit"],
    )
    league = league_for_club(club)
    result = shortlist(league.context, club.id, ROLES_BY_KEY[params["role"]], filters)
    return Response(
        {
            "club": s.club_summary(club),
            **s.league_meta(league),
            "filters": {
                "max_age": filters.max_age,
                "min_age": filters.min_age,
                "min_minutes": filters.min_minutes,
                "include_low_coverage": filters.include_low_coverage,
                "include_secondary": filters.include_secondary,
                "limit": filters.limit,
            },
            **s.shortlist_data(result, league),
        }
    )


@api_view(["GET"])
def player_list(request):
    params = _validated(s.PlayerListQuerySerializer, request)
    players = Player.objects.select_related("club", "source").order_by("name")
    if params.get("search"):
        players = players.filter(name__icontains=params["search"].strip())
    if params.get("club"):
        players = players.filter(club__slug=params["club"])
    if params.get("position"):
        # Secondary positions live in a JSON list; JSON lookups differ between MySQL and
        # SQLite, so match them in Python to behave identically on both.
        position = params["position"]
        players = (
            p for p in players if p.position == position or position in p.secondary_positions
        )
    return Response(
        [
            {
                "slug": p.slug,
                "name": p.name,
                "position": p.position,
                "age": p.age_on(p.source.as_of),
                "club": s.club_summary(p.club) if p.club else None,
                "is_demo": p.source.is_demo,
            }
            for p in islice(players, params["limit"])
        ]
    )


@api_view(["GET"])
def player_detail(request, slug):
    player = get_object_or_404(Player.objects.select_related("club", "source"), slug=slug)
    league = league_for_player(player)
    if league is None or player.id not in league.seasons:
        return Response(
            {
                "player": s.player_summary(player, None),
                "source": s.source_data(player.source),
                "season": None,
                "metrics": [],
                "role_scores": [],
                "detail": "No season statistics are available for this player.",
            }
        )

    season = league.seasons[player.id]
    benchmarks = league.context.benchmarks[player.position]
    role_keys = {key for role in roles_for(player.position) for key, _ in role.weights}
    relevant = [key for key in METRICS_BY_KEY if key in benchmarks or key in role_keys]
    metrics = []
    for key in relevant:
        metric = METRICS_BY_KEY[key]
        value = season.metrics.get(key)
        pool = benchmarks.get(key, [])
        metrics.append(
            {
                "key": key,
                "label": metric.label,
                "unit": metric.unit,
                "higher_is_better": metric.higher_is_better,
                "value": value,
                "percentile": percentile_rank(value, pool, metric.higher_is_better)
                if value is not None and pool
                else None,
                "pool_size": len(pool),
                "missing": value is None,
            }
        )

    role_scores = [
        s.role_score_data(score_role(season.metrics, role, benchmarks))
        for role in roles_for(player.position)
    ]
    available = sum(1 for m in metrics if not m["missing"])
    return Response(
        {
            "player": s.player_summary(player, league),
            **s.league_meta(league),
            "data_coverage": round(available / len(metrics), 3) if metrics else 0,
            "below_benchmark_minutes": (season.minutes or 0) < BENCHMARK_MIN_MINUTES,
            "metrics": metrics,
            "role_scores": role_scores,
        }
    )


@api_view(["GET"])
def compare(request):
    params = _validated(s.CompareQuerySerializer, request)
    slugs = params["players"]
    found = {
        p.slug: p for p in Player.objects.select_related("club", "source").filter(slug__in=slugs)
    }
    missing = [slug for slug in slugs if slug not in found]
    if missing:
        raise NotFound(f"Unknown player(s): {', '.join(missing)}")
    players = [found[slug] for slug in slugs]
    if len({p.source_id for p in players}) > 1:
        raise ValidationError({"players": "Players must come from the same data source."})

    league = league_for_player(players[0])
    if league is None:
        return Response(
            {"detail": "No season statistics are available."}, status=status.HTTP_404_NOT_FOUND
        )
    role = ROLES_BY_KEY[params["role"]] if params.get("role") else roles_for(players[0].position)[0]
    benchmarks = league.context.benchmarks[role.position]

    entries = []
    for player in players:
        season = league.seasons.get(player.id)
        metrics = season.metrics if season else {}
        entries.append(
            {
                "player": s.player_summary(player, league),
                "has_season": season is not None,
                "out_of_position": player.position != role.position,
                "role_score": s.role_score_data(score_role(metrics, role, benchmarks)),
            }
        )
    return Response(
        {
            **s.league_meta(league),
            "role": s.role_data(role),
            "available_roles": [s.role_data(r) for r in ROLES],
            "players": entries,
        }
    )
