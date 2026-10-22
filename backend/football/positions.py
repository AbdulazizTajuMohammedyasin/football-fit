"""Position groups used across squads, needs analysis and scoring."""

from django.db import models


class Position(models.TextChoices):
    GK = "GK", "Goalkeeper"
    CB = "CB", "Centre-back"
    FB = "FB", "Full-back"
    DM = "DM", "Defensive midfielder"
    CM = "CM", "Central midfielder"
    AM = "AM", "Attacking midfielder"
    W = "W", "Winger"
    ST = "ST", "Striker"


POSITION_ORDER: tuple[str, ...] = tuple(Position.values)
