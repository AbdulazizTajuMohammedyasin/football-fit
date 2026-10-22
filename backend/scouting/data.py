"""Load league data from the database into the pure analysis structures."""

from dataclasses import dataclass
from datetime import date

from football.models import Club, DataSource, Player, PlayerSeason

from .analysis import LeagueContext
from .scoring import PlayerSample


@dataclass
class League:
    source: DataSource
    competition: str
    season: str | None
    context: LeagueContext
    players: dict[int, Player]
    seasons: dict[int, PlayerSeason]

    @property
    def as_of(self) -> date:
        return self.source.as_of


def latest_season(source: DataSource, competition: str) -> str | None:
    return (
        PlayerSeason.objects.filter(player__source=source, competition=competition)
        .order_by("-season")
        .values_list("season", flat=True)
        .first()
    )


def load_league(source: DataSource, competition: str, season: str | None = None) -> League:
    season = season or latest_season(source, competition)
    rows = (
        PlayerSeason.objects.filter(player__source=source, competition=competition, season=season)
        .select_related("player", "player__club")
        .order_by("player__name")
    )
    samples: list[PlayerSample] = []
    players: dict[int, Player] = {}
    seasons: dict[int, PlayerSeason] = {}
    for row in rows:
        player = row.player
        players[player.id] = player
        seasons[player.id] = row
        samples.append(
            PlayerSample(
                id=player.id,
                slug=player.slug,
                name=player.name,
                position=player.position,
                # The season's club is what the player was observed playing for.
                club_id=row.club_id if row.club_id is not None else player.club_id,
                minutes=row.minutes,
                metrics=dict(row.metrics),
                age=player.age_on(source.as_of),
                secondary_positions=tuple(player.secondary_positions or ()),
            )
        )
    return League(
        source=source,
        competition=competition,
        season=season,
        context=LeagueContext(samples),
        players=players,
        seasons=seasons,
    )


def league_for_club(club: Club) -> League:
    return load_league(club.source, club.competition)


def league_for_player(player: Player) -> League | None:
    row = player.seasons.order_by("-season").first()
    if row is None:
        return None
    return load_league(player.source, row.competition, row.season)
