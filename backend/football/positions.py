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
    # Broad groups for sources (such as Fantasy Premier League) that do not record
    # detailed positions. They are never guessed into the detailed groups above.
    DF = "DF", "Defender"
    MF = "MF", "Midfielder"
    FW = "FW", "Forward"


POSITION_ORDER: tuple[str, ...] = tuple(Position.values)
