from datetime import date

from django.core.exceptions import ValidationError
from django.db import models

from .metrics import MetricValidationError, validate_metrics
from .positions import POSITION_ORDER, Position


class DataSource(models.Model):
    """Where a set of clubs, players and statistics came from."""

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    is_demo = models.BooleanField(
        default=False,
        help_text="Demo sources contain fictional data and must be labelled as such in the UI.",
    )
    licence = models.TextField(blank=True, help_text="Licence or usage terms for this data.")
    url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    as_of = models.DateField(help_text="Date the data reflects; used for ages and freshness.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Club(models.Model):
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="clubs")
    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=120)
    short_name = models.CharField(max_length=40, blank=True)
    competition = models.CharField(max_length=80, default="Premier League")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


def validate_positions(value) -> None:
    if not isinstance(value, list) or any(item not in POSITION_ORDER for item in value):
        raise ValidationError("secondary_positions must be a list of position codes")


class Player(models.Model):
    class Foot(models.TextChoices):
        LEFT = "left", "Left"
        RIGHT = "right", "Right"
        BOTH = "both", "Both"

    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="players")
    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=120)
    club = models.ForeignKey(
        Club, on_delete=models.SET_NULL, null=True, blank=True, related_name="players"
    )
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=80, blank=True)
    position = models.CharField(max_length=2, choices=Position.choices)
    secondary_positions = models.JSONField(
        default=list, blank=True, validators=[validate_positions]
    )
    preferred_foot = models.CharField(max_length=5, choices=Foot.choices, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["position"])]

    def __str__(self) -> str:
        return self.name

    def age_on(self, on: date) -> int | None:
        """Age in whole years on `on`, or None when the date of birth is unknown."""
        if self.date_of_birth is None:
            return None
        dob = self.date_of_birth
        return on.year - dob.year - ((on.month, on.day) < (dob.month, dob.day))


class PlayerSeason(models.Model):
    """A player's observed statistics for one season and competition."""

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="seasons")
    club = models.ForeignKey(
        Club, on_delete=models.SET_NULL, null=True, blank=True, related_name="player_seasons"
    )
    season = models.CharField(max_length=9, help_text="e.g. 2025-26")
    competition = models.CharField(max_length=80, default="Premier League")
    appearances = models.PositiveIntegerField(null=True, blank=True)
    minutes = models.PositiveIntegerField(null=True, blank=True)
    metrics = models.JSONField(
        default=dict,
        blank=True,
        help_text="Metric key to value. Missing metrics are omitted, never stored as zero.",
    )

    class Meta:
        ordering = ["-season", "player__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["player", "season", "competition"], name="unique_player_season"
            )
        ]

    def __str__(self) -> str:
        return f"{self.player} {self.season} ({self.competition})"

    def clean(self) -> None:
        try:
            self.metrics = validate_metrics(self.metrics)
        except MetricValidationError as exc:
            raise ValidationError({"metrics": str(exc)}) from exc
