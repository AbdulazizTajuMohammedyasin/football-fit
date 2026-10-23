from django.contrib import admin

from .models import SavedPlayer, SavedShortlist


class SavedPlayerInline(admin.TabularInline):
    model = SavedPlayer
    extra = 0


@admin.register(SavedShortlist)
class SavedShortlistAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "club_slug", "role_key", "updated_at"]
    inlines = [SavedPlayerInline]
