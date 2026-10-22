from django.contrib import admin

from .models import Club, DataSource, Player, PlayerSeason


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ["name", "is_demo", "as_of"]


@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ["name", "competition", "source"]
    search_fields = ["name"]


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ["name", "club", "position", "date_of_birth"]
    list_filter = ["position", "club"]
    search_fields = ["name"]


@admin.register(PlayerSeason)
class PlayerSeasonAdmin(admin.ModelAdmin):
    list_display = ["player", "season", "competition", "minutes"]
    list_filter = ["season", "competition"]
