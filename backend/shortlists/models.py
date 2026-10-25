from django.conf import settings
from django.db import models


class SavedShortlist(models.Model):
    """A user's named list of players.

    Players and clubs are referenced by slug rather than foreign key: re-importing a data
    source replaces its rows, and a user's saved list must survive that. Entries whose
    player is no longer in the data are reported as unavailable instead of disappearing.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shortlists"
    )
    name = models.CharField(max_length=100)
    club_slug = models.SlugField(
        max_length=120, blank=True, help_text="Club the list was built for, if any."
    )
    role_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class SavedPlayer(models.Model):
    shortlist = models.ForeignKey(SavedShortlist, on_delete=models.CASCADE, related_name="entries")
    player_slug = models.SlugField(max_length=120)
    note = models.CharField(max_length=500, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["shortlist", "player_slug"], name="unique_player_per_shortlist"
            )
        ]

    def __str__(self) -> str:
        return f"{self.player_slug} in {self.shortlist}"
